import { EventEmitter } from 'events';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 队列统计信息
 */
export interface QueueStats {
  totalMessages: number;
  pendingMessages: number;
  processingMessages: number;
  completedMessages: number;
  failedMessages: number;
  deadLetterMessages: number;
  averageProcessingTime: number;
  throughput: number; // messages per second
  errorRate: number;
}

/**
 * 消费者统计信息
 */
export interface ConsumerStats {
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  currentConcurrency: number;
  maxConcurrency: number;
  errorRate: number;
  lastProcessedAt?: number;
  lastError?: string;
}

/**
 * 生产者统计信息
 */
export interface ProducerStats {
  totalSent: number;
  totalFailed: number;
  averageSendTime: number;
  batchSize: number;
  batchCount: number;
  errorRate: number;
  lastSentAt?: number;
  lastError?: string;
}

/**
 * 系统资源使用信息
 */
export interface SystemStats {
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  uptime: number;
  eventLoopDelay: number;
}

/**
 * 性能监控配置
 */
export interface PerformanceConfig {
  enabled: boolean;
  samplingInterval: number;
  maxHistory: number;
  alertThresholds: {
    processingTime: number;
    errorRate: number;
    queueSize: number;
    memoryUsage: number;
  };
}

/**
 * 生产级性能监控器
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private queueStats: Map<string, QueueStats> = new Map();
  private consumerStats: Map<string, ConsumerStats> = new Map();
  private producerStats: Map<string, ProducerStats> = new Map();
  private systemStats: SystemStats | null = null;
  private config: PerformanceConfig;
  private samplingTimer: NodeJS.Timeout | null = null;
  private startTime = Date.now();

  constructor(config?: Partial<PerformanceConfig>) {
    super();
    this.config = {
      enabled: true,
      samplingInterval: 5000,
      maxHistory: 10000,
      alertThresholds: {
        processingTime: 5000,
        errorRate: 0.05,
        queueSize: 10000,
        memoryUsage: 0.8,
      },
      ...config,
    };

    if (this.config.enabled) {
      this.startSampling();
    }
  }

  /**
   * 记录性能指标
   */
  public recordMetric(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // 限制历史记录大小
    if (this.metrics.length > this.config.maxHistory) {
      this.metrics = this.metrics.slice(-this.config.maxHistory);
    }

    // 检查警报阈值
    this.checkAlertThresholds(metrics);

    // 更新统计信息
    this.updateStats(metrics);

    this.emit('metric:recorded', metrics);
  }

  /**
   * 更新队列统计信息
   */
  public updateQueueStats(queueName: string, stats: Partial<QueueStats>): void {
    const current = this.queueStats.get(queueName) || this.createEmptyQueueStats();
    const updated = { ...current, ...stats, timestamp: Date.now() };
    this.queueStats.set(queueName, updated);
    this.emit('queue:stats:updated', queueName, updated);
  }

  /**
   * 更新消费者统计信息
   */
  public updateConsumerStats(consumerId: string, stats: Partial<ConsumerStats>): void {
    const current = this.consumerStats.get(consumerId) || this.createEmptyConsumerStats();
    const updated = { ...current, ...stats, timestamp: Date.now() };
    this.consumerStats.set(consumerId, updated);
    this.emit('consumer:stats:updated', consumerId, updated);
  }

  /**
   * 更新生产者统计信息
   */
  public updateProducerStats(producerId: string, stats: Partial<ProducerStats>): void {
    const current = this.producerStats.get(producerId) || this.createEmptyProducerStats();
    const updated = { ...current, ...stats, timestamp: Date.now() };
    this.producerStats.set(producerId, updated);
    this.emit('producer:stats:updated', producerId, updated);
  }

  /**
   * 获取队列统计信息
   */
  public getQueueStats(queueName?: string): QueueStats | Map<string, QueueStats> {
    if (queueName) {
      return this.queueStats.get(queueName) || this.createEmptyQueueStats();
    }
    return new Map(this.queueStats);
  }

  /**
   * 获取消费者统计信息
   */
  public getConsumerStats(consumerId?: string): ConsumerStats | Map<string, ConsumerStats> {
    if (consumerId) {
      return this.consumerStats.get(consumerId) || this.createEmptyConsumerStats();
    }
    return new Map(this.consumerStats);
  }

  /**
   * 获取生产者统计信息
   */
  public getProducerStats(producerId?: string): ProducerStats | Map<string, ProducerStats> {
    if (producerId) {
      return this.producerStats.get(producerId) || this.createEmptyProducerStats();
    }
    return new Map(this.producerStats);
  }

  /**
   * 获取系统统计信息
   */
  public getSystemStats(): SystemStats {
    return this.systemStats || this.collectSystemStats();
  }

  /**
   * 获取性能摘要
   */
  public getPerformanceSummary(): any {
    const recentMetrics = this.getRecentMetrics(100);
    
    return {
      uptime: Date.now() - this.startTime,
      totalMetrics: this.metrics.length,
      recentMetrics: {
        count: recentMetrics.length,
        averageProcessingTime: this.calculateAverageTime(recentMetrics),
        errorRate: this.calculateErrorRate(recentMetrics),
      },
      queues: Object.fromEntries(this.queueStats),
      consumers: Object.fromEntries(this.consumerStats),
      producers: Object.fromEntries(this.producerStats),
      system: this.getSystemStats(),
    };
  }

  /**
   * 获取最近指标
   */
  public getRecentMetrics(count: number): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * 获取指标历史
   */
  public getMetricsHistory(operation?: string, timeRange?: number): PerformanceMetrics[] {
    let filtered = this.metrics;
    
    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }
    
    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      filtered = filtered.filter(m => m.timestamp >= cutoff);
    }
    
    return filtered;
  }

  /**
   * 清除历史数据
   */
  public clearHistory(): void {
    this.metrics = [];
    this.queueStats.clear();
    this.consumerStats.clear();
    this.producerStats.clear();
    this.emit('history:cleared');
  }

  /**
   * 开始采样
   */
  public startSampling(): void {
    if (this.samplingTimer) {
      return;
    }

    this.samplingTimer = setInterval(() => {
      this.systemStats = this.collectSystemStats();
      this.emit('system:stats:updated', this.systemStats);
    }, this.config.samplingInterval);
  }

  /**
   * 停止采样
   */
  public stopSampling(): void {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = null;
    }
  }

  /**
   * 生成性能报告
   */
  public generateReport(): string {
    const summary = this.getPerformanceSummary();
    return JSON.stringify(summary, null, 2);
  }

  /**
   * 检查警报阈值
   */
  private checkAlertThresholds(metrics: PerformanceMetrics): void {
    if (!metrics.success) {
      return;
    }

    if (metrics.duration > this.config.alertThresholds.processingTime) {
      this.emit('alert:processingTime', metrics);
    }

    if (metrics.error) {
      this.emit('alert:error', metrics);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(metrics: PerformanceMetrics): void {
    // 根据操作类型更新相应统计
    if (metrics.metadata?.queueName) {
      this.updateQueueStatsFromMetric(metrics.metadata.queueName, metrics);
    }
    
    if (metrics.metadata?.consumerId) {
      this.updateConsumerStatsFromMetric(metrics.metadata.consumerId, metrics);
    }
    
    if (metrics.metadata?.producerId) {
      this.updateProducerStatsFromMetric(metrics.metadata.producerId, metrics);
    }
  }

  /**
   * 从指标更新队列统计
   */
  private updateQueueStatsFromMetric(queueName: string, metrics: PerformanceMetrics): void {
    const stats = this.queueStats.get(queueName) || this.createEmptyQueueStats();
    
    if (metrics.operation === 'send') {
      stats.totalMessages++;
      stats.pendingMessages++;
    } else if (metrics.operation === 'process') {
      stats.processingMessages--;
      if (metrics.success) {
        stats.completedMessages++;
        stats.pendingMessages--;
      } else {
        stats.failedMessages++;
      }
    }
    
    stats.averageProcessingTime = this.calculateAverageTime(
      this.getMetricsHistory('process', 60000).filter(m => m.metadata?.queueName === queueName)
    );
    
    this.queueStats.set(queueName, stats);
  }

  /**
   * 从指标更新消费者统计
   */
  private updateConsumerStatsFromMetric(consumerId: string, metrics: PerformanceMetrics): void {
    const stats = this.consumerStats.get(consumerId) || this.createEmptyConsumerStats();
    
    if (metrics.operation === 'process') {
      if (metrics.success) {
        stats.totalProcessed++;
        stats.lastProcessedAt = metrics.timestamp;
      } else {
        stats.totalFailed++;
        stats.lastError = metrics.error;
      }
    }
    
    stats.averageProcessingTime = this.calculateAverageTime(
      this.getMetricsHistory('process', 60000).filter(m => m.metadata?.consumerId === consumerId)
    );
    
    this.consumerStats.set(consumerId, stats);
  }

  /**
   * 从指标更新生产者统计
   */
  private updateProducerStatsFromMetric(producerId: string, metrics: PerformanceMetrics): void {
    const stats = this.producerStats.get(producerId) || this.createEmptyProducerStats();
    
    if (metrics.operation === 'send') {
      if (metrics.success) {
        stats.totalSent++;
        stats.lastSentAt = metrics.timestamp;
      } else {
        stats.totalFailed++;
        stats.lastError = metrics.error;
      }
    }
    
    stats.averageSendTime = this.calculateAverageTime(
      this.getMetricsHistory('send', 60000).filter(m => m.metadata?.producerId === producerId)
    );
    
    this.producerStats.set(producerId, stats);
  }

  /**
   * 收集系统统计信息
   */
  private collectSystemStats(): SystemStats {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memoryUsage: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      eventLoopDelay: this.measureEventLoopDelay(),
    };
  }

  /**
   * 测量事件循环延迟
   */
  private measureEventLoopDelay(): number {
    const start = process.hrtime.bigint();
    const startTime = Date.now();
    
    // 简单的延迟测量
    return 0; // 实际实现会更复杂
  }

  /**
   * 计算平均时间
   */
  private calculateAverageTime(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const errors = metrics.filter(m => !m.success).length;
    return errors / metrics.length;
  }

  /**
   * 创建空的队列统计
   */
  private createEmptyQueueStats(): QueueStats {
    return {
      totalMessages: 0,
      pendingMessages: 0,
      processingMessages: 0,
      completedMessages: 0,
      failedMessages: 0,
      deadLetterMessages: 0,
      averageProcessingTime: 0,
      throughput: 0,
      errorRate: 0,
    };
  }

  /**
   * 创建空的消费者统计
   */
  private createEmptyConsumerStats(): ConsumerStats {
    return {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      currentConcurrency: 0,
      maxConcurrency: 0,
      errorRate: 0,
    };
  }

  /**
   * 创建空的生产者统计
   */
  private createEmptyProducerStats(): ProducerStats {
    return {
      totalSent: 0,
      totalFailed: 0,
      averageSendTime: 0,
      batchSize: 0,
      batchCount: 0,
      errorRate: 0,
    };
  }
}