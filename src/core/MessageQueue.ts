import { DatabaseManager } from './DatabaseManager';
import { Logger } from '../types/logger';
import { Message, SendMessageOptions, DeadLetterMessage } from '../types/message/type';
import { QueueConfig } from '../types/queue/config';
import { ConsumeOptions } from '../types/consumer/type';
import { BatchMessage, BatchSendResult } from '../types/producer/batch';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * 消息队列选项
 */
export interface MessageQueueOptions {
  logger?: Logger;
  enableMetrics?: boolean;
  enableDeadLetter?: boolean;
  maxRetries?: number;
}

/**
 * 消息队列统计信息
 */
export interface QueueMetrics {
  queueName: string;
  totalMessages: number;
  pendingMessages: number;
  processingMessages: number;
  completedMessages: number;
  failedMessages: number;
  deadLetterMessages: number;
  averageProcessingTime: number;
  throughput: number;
  lastUpdated: Date;
}

/**
 * 消费者处理器
 */
export type MessageHandler<T = any> = (message: Message<T>) => Promise<void> | void;

/**
 * 生产级消息队列实现
 */
export class MessageQueue extends EventEmitter {
  private db: DatabaseManager;
  private logger?: Logger;
  private options: MessageQueueOptions;
  private consumers = new Map<string, Set<string>>();
  private isShuttingDown = false;

  constructor(db: DatabaseManager, options: MessageQueueOptions = {}) {
    super();
    this.db = db;
    this.logger = options.logger;
    this.options = {
      enableMetrics: true,
      enableDeadLetter: true,
      maxRetries: 3,
      ...options,
    };
  }

  /**
   * 发送消息
   */
  public async send<T>(
    queueName: string,
    payload: T,
    options: SendMessageOptions = {}
  ): Promise<string> {
    const messageId = uuidv4();
    const now = Date.now();
    
    const message: Omit<Message<T>, 'id'> = {
      queueName,
      payload,
      retries: 0,
      maxRetries: options.maxRetries ?? this.options.maxRetries!,
      priority: options.priority ?? 5,
      createdAt: new Date(now),
      availableAt: new Date(now + (options.delay || 0)),
      metadata: options.metadata,
    };

    try {
      await this.db.executeTransaction((db) => {
        const stmt = this.db.prepare(`
          INSERT INTO messages (
            id, queue_name, payload, status, priority, retries, max_retries,
            created_at, available_at, metadata, deduplication_id, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          messageId,
          message.queueName,
          JSON.stringify(message.payload),
          'pending',
          message.priority,
          message.retries,
          message.maxRetries,
          Math.floor(message.createdAt.getTime() / 1000),
          Math.floor(message.availableAt.getTime() / 1000),
          message.metadata ? JSON.stringify(message.metadata) : null,
          options.deduplicationId || null,
          options.expiresAt ? Math.floor(options.expiresAt.getTime() / 1000) : null
        );

        // 处理去重
        if (options.deduplicationId) {
          const existing = this.db.prepare(`
            SELECT id FROM messages 
            WHERE queue_name = ? AND deduplication_id = ? AND status != 'failed'
            ORDER BY created_at DESC LIMIT 1
          `).get(queueName, options.deduplicationId);

          if (existing && existing.id !== messageId) {
            // 返回已存在的消息ID
            throw new Error(`Duplicate message with deduplication ID: ${options.deduplicationId}`);
          }
        }

        return messageId;
      });

      this.logger?.debug('Message sent successfully', { queueName, messageId });
      this.emit('message:send', { queueName, messageId });

      return messageId;
    } catch (error) {
      this.logger?.error('Failed to send message', { queueName, error });
      throw error;
    }
  }

  /**
   * 批量发送消息
   */
  public async sendBatch<T>(
    queueName: string,
    messages: BatchMessage<T>[]
  ): Promise<BatchSendResult> {
    const batchId = uuidv4();
    const startTime = Date.now();
    const successful: string[] = [];
    const failed: Array<{ message: any; error: Error }> = [];

    try {
      // 并行处理消息
      const promises = messages.map(async (msg) => {
        try {
          const messageId = await this.send(queueName, msg.payload, msg.options);
          successful.push(messageId);
          return { success: true, messageId };
        } catch (error) {
          failed.push({ message: msg, error: error as Error });
          return { success: false, error };
        }
      });

      await Promise.allSettled(promises);

      const result: BatchSendResult = {
        successful,
        failed,
        batchId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };

      this.logger?.debug('Batch send completed', { queueName, batchId, ...result });
      this.emit('batch:send', { queueName, batchId, result });

      return result;
    } catch (error) {
      this.logger?.error('Batch send failed', { queueName, batchId, error });
      throw error;
    }
  }

  /**
   * 消费消息
   */
  public async consume<T>(
    queueName: string,
    handler: MessageHandler<T>,
    options: ConsumeOptions = {}
  ): Promise<() => Promise<void>> {
    const consumerId = uuidv4();
    const {
      batchSize = 1,
      pollInterval = 1000,
      concurrency = 1,
      processingTimeout = 30000,
      deadLetterQueue = { enabled: true, maxRetries: 3 },
    } = options;

    // 注册消费者
    if (!this.consumers.has(queueName)) {
      this.consumers.set(queueName, new Set());
    }
    this.consumers.get(queueName)!.add(consumerId);

    let isActive = true;

    const processMessages = async () => {
      if (!isActive || this.isShuttingDown) return;

      try {
        const messages = await this.fetchMessages(queueName, batchSize);
        
        if (messages.length === 0) {
          setTimeout(processMessages, pollInterval);
          return;
        }

        // 使用Promise池控制并发
        const processPromises = messages.map(async (message) => {
          try {
            await this.processMessage(message, handler, processingTimeout);
          } catch (error) {
            await this.handleMessageError(message, error as Error, deadLetterQueue);
          }
        });

        // 控制并发度
        const chunks = this.chunkArray(processPromises, concurrency);
        for (const chunk of chunks) {
          await Promise.allSettled(chunk.map(p => p()));
        }

        setTimeout(processMessages, pollInterval);
      } catch (error) {
        this.logger?.error('Error processing messages', { queueName, consumerId, error });
        setTimeout(processMessages, pollInterval * 2); // 指数退避
      }
    };

    // 启动消费者
    processMessages();

    this.logger?.info('Consumer started', { queueName, consumerId });
    this.emit('consumer:start', { queueName, consumerId });

    // 返回停止函数
    return async () => {
      isActive = false;
      this.consumers.get(queueName)?.delete(consumerId);
      this.logger?.info('Consumer stopped', { queueName, consumerId });
      this.emit('consumer:stop', { queueName, consumerId });
    };
  }

  /**
   * 获取待处理消息
   */
  private async fetchMessages(queueName: string, limit: number): Promise<Message[]> {
    return this.db.executeTransaction((db) => {
      const stmt = this.db.prepare(`
        SELECT * FROM messages 
        WHERE queue_name = ? AND status = 'pending' AND available_at <= strftime('%s', 'now')
        ORDER BY priority DESC, created_at ASC
        LIMIT ?
      `);

      const rows = stmt.all(queueName, limit);
      
      // 更新消息状态为处理中
      const updateStmt = this.db.prepare(`
        UPDATE messages SET status = 'processing', processing_time = strftime('%s', 'now')
        WHERE id = ?
      `);

      const messages = rows.map(row => ({
        id: row.id,
        queueName: row.queue_name,
        payload: JSON.parse(row.payload),
        retries: row.retries,
        maxRetries: row.max_retries,
        priority: row.priority,
        createdAt: new Date(row.created_at * 1000),
        availableAt: new Date(row.available_at * 1000),
        processedAt: row.processed_at ? new Date(row.processed_at * 1000) : undefined,
        failedAt: row.failed_at ? new Date(row.failed_at * 1000) : undefined,
        errorMessage: row.error_message,
        processingTime: row.processing_time,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }));

      messages.forEach(msg => updateStmt.run(msg.id));

      return messages;
    });
  }

  /**
   * 处理单个消息
   */
  private async processMessage<T>(
    message: Message<T>,
    handler: MessageHandler<T>,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Message processing timeout')), timeout);
      });

      await Promise.race([
        handler(message),
        timeoutPromise,
      ]);

      // 标记为完成
      await this.markMessageCompleted(message.id, Date.now() - startTime);
      
      this.logger?.debug('Message processed successfully', { messageId: message.id });
      this.emit('message:processed', { message });

    } catch (error) {
      // 标记为失败
      await this.markMessageFailed(message.id, error as Error);
      throw error;
    }
  }

  /**
   * 处理消息错误
   */
  private async handleMessageError(
    message: Message,
    error: Error,
    deadLetterConfig: { enabled: boolean; maxRetries: number }
  ): Promise<void> {
    const maxRetries = Math.min(message.maxRetries, deadLetterConfig.maxRetries);
    
    if (message.retries < maxRetries) {
      // 重试消息
      await this.retryMessage(message.id, error);
      this.logger?.warn('Message retry scheduled', { messageId: message.id, retries: message.retries + 1 });
    } else if (deadLetterConfig.enabled) {
      // 移入死信队列
      await this.moveToDeadLetter(message, error);
      this.logger?.error('Message moved to dead letter queue', { messageId: message.id, error: error.message });
    } else {
      // 直接失败
      await this.markMessageFailed(message.id, error);
      this.logger?.error('Message failed permanently', { messageId: message.id, error: error.message });
    }
  }

  /**
   * 标记消息完成
   */
  private async markMessageCompleted(messageId: string, processingTime: number): Promise<void> {
    return this.db.executeTransaction((db) => {
      const stmt = this.db.prepare(`
        UPDATE messages 
        SET status = 'completed', processed_at = strftime('%s', 'now'), processing_time = ?
        WHERE id = ?
      `);
      stmt.run(processingTime, messageId);
    });
  }

  /**
   * 标记消息失败
   */
  private async markMessageFailed(messageId: string, error: Error): Promise<void> {
    return this.db.executeTransaction((db) => {
      const stmt = this.db.prepare(`
        UPDATE messages 
        SET status = 'failed', failed_at = strftime('%s', 'now'), error_message = ?
        WHERE id = ?
      `);
      stmt.run(error.message, messageId);
    });
  }

  /**
   * 重试消息
   */
  private async retryMessage(messageId: string, error: Error): Promise<void> {
    return this.db.executeTransaction((db) => {
      const stmt = this.db.prepare(`
        UPDATE messages 
        SET status = 'pending', retries = retries + 1, available_at = strftime('%s', 'now') + (retries * 60)
        WHERE id = ?
      `);
      stmt.run(messageId);
    });
  }

  /**
   * 移入死信队列
   */
  private async moveToDeadLetter(message: Message, error: Error): Promise<void> {
    return this.db.executeTransaction((db) => {
      // 插入死信队列
      const dlqStmt = this.db.prepare(`
        INSERT INTO dead_letter_messages (
          id, original_id, queue_name, payload, error_message, retries, created_at, original_created_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const dlqId = uuidv4();
      dlqStmt.run(
        dlqId,
        message.id,
        message.queueName,
        JSON.stringify(message.payload),
        error.message,
        message.retries,
        Math.floor(Date.now() / 1000),
        Math.floor(message.createdAt.getTime() / 1000),
        message.metadata ? JSON.stringify(message.metadata) : null
      );

      // 删除原消息
      const deleteStmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
      deleteStmt.run(message.id);
    });
  }

  /**
   * 获取队列统计信息
   */
  public async getQueueStats(queueName: string): Promise<QueueMetrics> {
    const stats = this.db.prepare(`
      SELECT * FROM message_stats WHERE queue_name = ?
    `).get(queueName);

    if (!stats) {
      return {
        queueName,
        totalMessages: 0,
        pendingMessages: 0,
        processingMessages: 0,
        completedMessages: 0,
        failedMessages: 0,
        deadLetterMessages: 0,
        averageProcessingTime: 0,
        throughput: 0,
        lastUpdated: new Date(),
      };
    }

    return {
      queueName,
      totalMessages: stats.total_messages,
      pendingMessages: stats.pending_messages,
      processingMessages: stats.processing_messages,
      completedMessages: stats.completed_messages,
      failedMessages: stats.failed_messages,
      deadLetterMessages: stats.dead_letter_messages,
      averageProcessingTime: stats.avg_processing_time,
      throughput: stats.throughput || 0,
      lastUpdated: new Date(stats.last_updated * 1000),
    };
  }

  /**
   * 获取死信队列消息
   */
  public async getDeadLetterMessages(queueName: string): Promise<DeadLetterMessage[]> {
    const rows = this.db.prepare(`
      SELECT * FROM dead_letter_messages WHERE queue_name = ? ORDER BY created_at DESC
    `).all(queueName);

    return rows.map(row => ({
      id: row.id,
      originalId: row.original_id,
      queueName: row.queue_name,
      payload: JSON.parse(row.payload),
      errorMessage: row.error_message,
      retries: row.retries,
      createdAt: new Date(row.created_at * 1000),
      originalCreatedAt: new Date(row.original_created_at * 1000),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * 重新入队死信消息
   */
  public async requeueDeadLetterMessage(messageId: string): Promise<void> {
    return this.db.executeTransaction((db) => {
      const dlqMessage = this.db.prepare(`
        SELECT * FROM dead_letter_messages WHERE id = ?
      `).get(messageId);

      if (!dlqMessage) {
        throw new Error(`Dead letter message not found: ${messageId}`);
      }

      // 插入新消息
      const newMessageId = uuidv4();
      const insertStmt = this.db.prepare(`
        INSERT INTO messages (
          id, queue_name, payload, priority, retries, max_retries,
          created_at, available_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        newMessageId,
        dlqMessage.queue_name,
        dlqMessage.payload,
        5, // 默认优先级
        0, // 重置重试计数
        3, // 默认最大重试次数
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
        dlqMessage.metadata
      );

      // 删除死信消息
      const deleteStmt = this.db.prepare('DELETE FROM dead_letter_messages WHERE id = ?');
      deleteStmt.run(messageId);
    });
  }

  /**
   * 清理过期消息
   */
  public async cleanupExpiredMessages(queueName?: string): Promise<number> {
    const whereClause = queueName ? 'WHERE queue_name = ?' : '';
    const params = queueName ? [queueName] : [];

    return this.db.executeTransaction((db) => {
      const stmt = this.db.prepare(`
        DELETE FROM messages 
        WHERE expires_at IS NOT NULL AND expires_at < strftime('%s', 'now')
        ${whereClause}
      `);

      const result = stmt.run(...params);
      return result.changes;
    });
  }

  /**
   * 优雅关闭
   */
  public async gracefulShutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.logger?.info('Starting graceful shutdown...');

    // 等待所有消费者停止
    let attempts = 0;
    while (attempts < 30 && this.getActiveConsumerCount() > 0) {
      this.logger?.info(`Waiting for ${this.getActiveConsumerCount()} consumers to stop...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    this.logger?.info('Graceful shutdown completed');
  }

  /**
   * 获取活跃消费者数量
   */
  private getActiveConsumerCount(): number {
    return Array.from(this.consumers.values()).reduce((sum, set) => sum + set.size, 0);
  }

  /**
   * 工具函数：分块数组
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}