import { LocusMQConfig } from '../types/core/index';
import { DatabaseConfig } from '../types/database';
import { LoggerConfig } from '../types/logger';
import { QueueGlobalConfig } from '../types/queue/config';
import { ConsumerGlobalConfig } from '../types/consumer/config';
import { ProducerGlobalConfig } from '../types/producer/config';
import { EventEmitter } from 'events';

/**
 * 配置验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 生产级配置管理器
 */
export class ConfigurationManager extends EventEmitter {
  private config: LocusMQConfig;
  private isValidated = false;

  constructor(config: LocusMQConfig) {
    super();
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaults(config: LocusMQConfig): LocusMQConfig {
    return {
      ...config,
      database: {
        timeout: 5000,
        verbose: false,
        ...config.database,
      },
      queue: {
        maxRetries: 3,
        retryInitialDelay: 1000,
        retryDelayMultiplier: 2,
        processingTimeout: 30000,
        visibilityTimeout: 30000,
        cleanupInterval: 60000,
        maxConcurrency: 10,
        deadLetterQueue: {
          enabled: true,
          queueName: 'dlq',
          maxRetries: 3,
        },
        retention: {
          maxMessageAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          retentionTime: 7 * 24 * 60 * 60 * 1000, // 7 days
          cleanupBatchSize: 1000,
        },
        deduplication: {
          enabled: true,
          ttl: 24 * 60 * 60 * 1000, // 24 hours
        },
        priority: {
          enabled: true,
          maxPriority: 10,
        },
        ...config.queue,
      },
      consumer: {
        defaults: {
          pollInterval: 1000,
          maxConcurrency: 5,
          batchSize: 1,
          autoRetry: true,
          maxRetries: 3,
          retryInitialDelay: 1000,
          retryDelayMultiplier: 2,
          processingTimeout: 30000,
          visibilityTimeout: 30000,
          deadLetterQueue: {
            enabled: true,
            maxRetries: 3,
          },
          ...config.consumer?.defaults,
        },
        pool: {
          maxConnections: 10,
          minConnections: 2,
          idleTimeout: 30000,
          acquireTimeout: 5000,
          ...config.consumer?.pool,
        },
        ...config.consumer,
      },
      producer: {
        defaults: {
          defaultDelay: 0,
          defaultPriority: 5,
          defaultMaxRetries: 3,
          enableDeduplication: true,
          maxMessageSize: 1024 * 1024, // 1MB
          rateLimit: 1000, // messages per second
          ...config.producer?.defaults,
        },
        batch: {
          enabled: true,
          maxBatchSize: 100,
          maxWaitTime: 1000,
          maxRetries: 3,
          retryDelay: 1000,
          backoffStrategy: 'exponential',
          compressionEnabled: true,
          compressionThreshold: 1024, // 1KB
          parallelProcessing: true,
          parallelism: 5,
          ...config.producer?.batch,
        },
        pool: {
          maxConnections: 10,
          minConnections: 2,
          idleTimeout: 30000,
          acquireTimeout: 5000,
          ...config.producer?.pool,
        },
        ...config.producer,
      },
      logger: {
        level: 'info',
        format: 'json',
        outputs: ['console'],
        enableAsync: true,
        bufferSize: 1000,
        flushInterval: 1000,
        enableSampling: false,
        samplingRate: 0.1,
        ...config.logger,
      },
    };
  }

  /**
   * 验证配置
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 数据库配置验证
    if (!this.config.database.path) {
      errors.push('Database path is required');
    }

    if (this.config.database.timeout && this.config.database.timeout < 1000) {
      warnings.push('Database timeout is very low, may cause connection issues');
    }

    // 队列配置验证
    if (this.config.queue?.maxRetries && this.config.queue.maxRetries > 10) {
      warnings.push('High retry count may cause message delays');
    }

    if (this.config.queue?.processingTimeout && this.config.queue.processingTimeout < 5000) {
      warnings.push('Very low processing timeout may cause premature failures');
    }

    // 消费者配置验证
    if (this.config.consumer?.defaults?.maxConcurrency && this.config.consumer.defaults.maxConcurrency > 50) {
      warnings.push('High concurrency may impact performance');
    }

    // 生产者配置验证
    if (this.config.producer?.batch?.maxBatchSize && this.config.producer.batch.maxBatchSize > 1000) {
      warnings.push('Very large batch size may cause memory issues');
    }

    if (this.config.producer?.defaults?.maxMessageSize && this.config.producer.defaults.maxMessageSize > 10 * 1024 * 1024) {
      warnings.push('Very large message size may impact performance');
    }

    // 日志配置验证
    if (this.config.logger?.bufferSize && this.config.logger.bufferSize > 10000) {
      warnings.push('Very large log buffer may cause memory issues');
    }

    this.isValidated = errors.length === 0;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 获取完整配置
   */
  public getConfig(): LocusMQConfig {
    return this.config;
  }

  /**
   * 获取数据库配置
   */
  public getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  /**
   * 获取日志配置
   */
  public getLoggerConfig(): LoggerConfig {
    return this.config.logger!;
  }

  /**
   * 获取队列配置
   */
  public getQueueConfig(): QueueGlobalConfig {
    return this.config.queue!;
  }

  /**
   * 获取消费者配置
   */
  public getConsumerConfig(): ConsumerGlobalConfig {
    return this.config.consumer!;
  }

  /**
   * 获取生产者配置
   */
  public getProducerConfig(): ProducerGlobalConfig {
    return this.config.producer!;
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<LocusMQConfig>): void {
    this.config = this.mergeWithDefaults({
      ...this.config,
      ...updates,
    });
    this.isValidated = false;
    this.emit('config:updated', this.config);
  }

  /**
   * 获取运行时配置
   */
  public getRuntimeConfig(): any {
    return {
      database: this.getDatabaseConfig(),
      queue: this.getQueueConfig(),
      consumer: this.getConsumerConfig(),
      producer: this.getProducerConfig(),
      logger: this.getLoggerConfig(),
    };
  }

  /**
   * 检查配置是否已验证
   */
  public isConfigValidated(): boolean {
    return this.isValidated;
  }

  /**
   * 导出配置为JSON
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 从JSON导入配置
   */
  public importConfig(configJson: string): ValidationResult {
    try {
      const config = JSON.parse(configJson);
      this.config = this.mergeWithDefaults(config);
      this.isValidated = false;
      return this.validate();
    } catch (error) {
      return {
        valid: false,
        errors: [`Invalid JSON: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * 获取环境特定配置
   */
  public static getEnvironmentConfig(env: string): Partial<LocusMQConfig> {
    switch (env) {
      case 'production':
        return {
          database: {
            timeout: 10000,
            verbose: false,
          },
          queue: {
            maxRetries: 5,
            cleanupInterval: 300000, // 5 minutes
            maxConcurrency: 20,
          },
          consumer: {
            defaults: {
              pollInterval: 500,
              maxConcurrency: 10,
              batchSize: 10,
            },
            pool: {
              maxConnections: 20,
              minConnections: 5,
            },
          },
          producer: {
            batch: {
              maxBatchSize: 1000,
              maxWaitTime: 5000,
            },
          },
        };

      case 'development':
        return {
          database: {
            timeout: 5000,
            verbose: true,
          },
          queue: {
            maxRetries: 3,
            cleanupInterval: 60000,
            maxConcurrency: 5,
          },
          consumer: {
            defaults: {
              pollInterval: 1000,
              maxConcurrency: 3,
              batchSize: 1,
            },
          },
          producer: {
            batch: {
              maxBatchSize: 10,
              maxWaitTime: 1000,
            },
          },
        };

      case 'test':
        return {
          database: {
            timeout: 1000,
            verbose: false,
          },
          queue: {
            maxRetries: 1,
            cleanupInterval: 1000,
            maxConcurrency: 1,
          },
          consumer: {
            defaults: {
              pollInterval: 100,
              maxConcurrency: 1,
              batchSize: 1,
            },
          },
          producer: {
            batch: {
              maxBatchSize: 1,
              maxWaitTime: 100,
            },
          },
        };

      default:
        return {};
    }
  }
}