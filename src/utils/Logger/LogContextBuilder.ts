import { LogContext } from '../../types/logger/context';

/**
 * 日志上下文构建器
 */
export class LogContextBuilder {
  private context: LogContext = {};

  /**
   * 设置模块名称
   */
  module(name: string): LogContextBuilder {
    this.context.module = name;
    return this;
  }

  /**
   * 设置操作名称
   */
  operation(name: string): LogContextBuilder {
    this.context.operation = name;
    return this;
  }


  /**
   * 设置请求ID
   */
  requestId(requestId: string): this {
    this.context.requestId = requestId;
    return this;
  }

  /**
   * 设置队列名称
   */
  queue(queueName: string): LogContextBuilder {
    this.context.queueName = queueName;
    return this;
  }

  /**
   * 设置消息ID
   */
  message(messageId: string): LogContextBuilder {
    this.context.messageId = messageId;
    return this;
  }

  /**
   * 设置消费者ID
   */
  consumer(consumerId: string): LogContextBuilder {
    this.context.consumerId = consumerId;
    return this;
  }

  /**
   * 设置生产者ID
   */
  producer(producerId: string): LogContextBuilder {
    this.context.producerId = producerId;
    return this;
  }

  /**
   * 设置用户ID
   */
  userId(userId: string): this {
    this.context.userId = userId;
    return this;
  }

  /**
   * 设置会话ID
   */
  sessionId(sessionId: string): this {
    this.context.sessionId = sessionId;
    return this;
  }

  /**
   * 添加标签
   */
  tag(tag: string): this {
    if (!this.context.tags) {
      this.context.tags = [];
    }
    this.context.tags.push(tag);
    return this;
  }

  /**
   * 添加多个标签
   */
  tags(tags: string[]): this {
    if (!this.context.tags) {
      this.context.tags = [];
    }
    this.context.tags.push(...tags);
    return this;
  }

  /**
   * 添加性能指标
   */
  metrics(metrics: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    throughput?: number;
    [key: string]: any;
  }): this {
    this.context.metrics = { ...this.context.metrics, ...metrics };
    return this;
  }

  /**
   * 添加元数据
   */
  metadata(metadata: Record<string, any>): this {
    this.context.metadata = { ...this.context.metadata, ...metadata };
    return this;
  }

  /**
   * 设置自定义字段
   */
  setField(key: string, value: any): this {
    this.context[key] = value;
    return this;
  }

  /**
   * 合并现有上下文
   */
  merge(context: Partial<LogContext>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * 构建最终上下文
   */
  build(): LogContext {
    return { ...this.context };
  }

  /**
   * 克隆构建器
   */
  clone(): LogContextBuilder {
    const builder = new LogContextBuilder();
    builder.context = { ...this.context };
    return builder;
  }

  /**
   * 静态创建方法
   */
  static create(): LogContextBuilder {
    return new LogContextBuilder();
  }

  /**
   * 从现有上下文创建
   */
  static from(context: LogContext): LogContextBuilder {
    const builder = new LogContextBuilder();
    builder.context = { ...context };
    return builder;
  }
}