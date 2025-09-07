import { EventEmitter } from 'events';
import { LocusMQConfig } from '../types/core/index';
import { DatabaseManager } from './DatabaseManager';
import { MessageQueue } from './MessageQueue';
import { ConfigurationManager } from './ConfigurationManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { HealthChecker } from './HealthChecker';
import { Logger } from '../utils/Logger';

/**
 * LocusMQ 应用状态
 */
export enum AppState {
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * 生产级 LocusMQ 主应用类
 */
export class LocusMQ extends EventEmitter {
  private configManager: ConfigurationManager;
  private databaseManager: DatabaseManager;
  private messageQueue: MessageQueue;
  private performanceMonitor: PerformanceMonitor;
  private healthChecker: HealthChecker;
  private logger: Logger;
  private state = AppState.INITIALIZED;
  private shutdownPromise: Promise<void> | null = null;

  constructor(config: LocusMQConfig) {
    super();
    
    // 初始化配置管理器
    this.configManager = new ConfigurationManager(config);
    
    // 验证配置
    const validation = this.configManager.validate();
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // 初始化日志器
    this.logger = new Logger(this.configManager.getLoggerConfig());
    
    // 初始化数据库管理器
    this.databaseManager = new DatabaseManager(
      this.configManager.getDatabaseConfig(),
      this.logger
    );
    
    // 初始化性能监控器
    this.performanceMonitor = new PerformanceMonitor({
      enabled: true,
      samplingInterval: 5000,
      maxHistory: 10000,
      alertThresholds: {
        processingTime: 5000,
        errorRate: 0.05,
        queueSize: 10000,
        memoryUsage: 0.8,
      },
    });
    
    // 初始化健康检查器
    this.healthChecker = new HealthChecker(
      {},
      this.databaseManager,
      this.performanceMonitor
    );
    
    // 初始化消息队列
    this.messageQueue = new MessageQueue(
      this.databaseManager,
      this.performanceMonitor,
      this.logger
    );

    this.setupEventHandlers();
  }

  /**
   * 启动应用
   */
  public async start(): Promise<void> {
    if (this.state !== AppState.INITIALIZED && this.state !== AppState.STOPPED) {
      throw new Error(`Cannot start from state: ${this.state}`);
    }

    this.state = AppState.STARTING;
    this.emit('state:change', this.state);

    try {
      this.logger.info('Starting LocusMQ...');

      // 初始化数据库
      await this.databaseManager.initialize();
      this.logger.info('Database initialized');

      // 启动消息队列
      await this.messageQueue.start();
      this.logger.info('Message queue started');

      // 启动性能监控
      this.performanceMonitor.startSampling();
      this.logger.info('Performance monitoring started');

      // 启动健康检查
      this.healthChecker.start();
      this.logger.info('Health checker started');

      this.state = AppState.RUNNING;
      this.emit('state:change', this.state);
      this.emit('ready');

      this.logger.info('LocusMQ started successfully');
    } catch (error) {
      this.state = AppState.ERROR;
      this.emit('state:change', this.state);
      this.emit('error', error);
      this.logger.error('Failed to start LocusMQ', error);
      throw error;
    }
  }

  /**
   * 停止应用
   */
  public async stop(): Promise<void> {
    if (this.state === AppState.STOPPED || this.state === AppState.STOPPING) {
      return;
    }

    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.state = AppState.STOPPING;
    this.emit('state:change', this.state);

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  /**
   * 执行关闭流程
   */
  private async performShutdown(): Promise<void> {
    try {
      this.logger.info('Stopping LocusMQ...');

      // 停止健康检查
      this.healthChecker.stop();
      this.logger.info('Health checker stopped');

      // 停止性能监控
      this.performanceMonitor.stopSampling();
      this.logger.info('Performance monitoring stopped');

      // 停止消息队列
      await this.messageQueue.stop();
      this.logger.info('Message queue stopped');

      // 关闭数据库连接
      await this.databaseManager.close();
      this.logger.info('Database connection closed');

      this.state = AppState.STOPPED;
      this.emit('state:change', this.state);
      this.emit('stopped');

      this.logger.info('LocusMQ stopped successfully');
    } catch (error) {
      this.state = AppState.ERROR;
      this.emit('state:change', this.state);
      this.emit('error', error);
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }

  /**
   * 发送消息
   */
  public async sendMessage(
    queueName: string,
    payload: any,
    options?: any
  ): Promise<string> {
    this.ensureRunning();
    return this.messageQueue.sendMessage(queueName, payload, options);
  }

  /**
   * 批量发送消息
   */
  public async sendBatch(
    queueName: string,
    messages: Array<{ payload: any; options?: any }>
  ): Promise<string[]> {
    this.ensureRunning();
    return this.messageQueue.sendBatch(queueName, messages);
  }

  /**
   * 消费消息
   */
  public async consume(
    queueName: string,
    handler: (message: any) => Promise<void>,
    options?: any
  ): Promise<string> {
    this.ensureRunning();
    return this.messageQueue.consume(queueName, handler, options);
  }

  /**
   * 停止消费
   */
  public async stopConsumer(consumerId: string): Promise<void> {
    this.ensureRunning();
    return this.messageQueue.stopConsumer(consumerId);
  }

  /**
   * 获取队列统计信息
   */
  public async getQueueStats(queueName?: string): Promise<any> {
    this.ensureRunning();
    return this.messageQueue.getStats(queueName);
  }

  /**
   * 获取性能监控摘要
   */
  public getPerformanceSummary(): any {
    return this.performanceMonitor.getPerformanceSummary();
  }

  /**
   * 获取健康检查摘要
   */
  public getHealthSummary(): any {
    return this.healthChecker.getHealthSummary();
  }

  /**
   * 获取配置
   */
  public getConfig(): any {
    return this.configManager.getRuntimeConfig();
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: any): void {
    this.configManager.updateConfig(updates);
    this.logger.info('Configuration updated');
  }

  /**
   * 获取应用状态
   */
  public getState(): AppState {
    return this.state;
  }

  /**
   * 检查是否正在运行
   */
  public isRunning(): boolean {
    return this.state === AppState.RUNNING;
  }

  /**
   * 等待应用就绪
   */
  public async waitForReady(timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === AppState.RUNNING) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        this.removeAllListeners('ready');
        reject(new Error('Timeout waiting for ready state'));
      }, timeout);

      this.once('ready', () => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  /**
   * 确保应用正在运行
   */
  private ensureRunning(): void {
    if (this.state !== AppState.RUNNING) {
      throw new Error(`Application is not running. Current state: ${this.state}`);
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 性能监控警报
    this.performanceMonitor.on('alert:processingTime', (metrics) => {
      this.logger.warn('High processing time detected', metrics);
    });

    this.performanceMonitor.on('alert:error', (metrics) => {
      this.logger.error('Error detected', metrics);
    });

    // 健康检查警报
    this.healthChecker.on('alert:unhealthy', (result) => {
      this.logger.error('Health check failed', result);
    });

    // 配置更新
    this.configManager.on('config:updated', (config) => {
      this.logger.info('Configuration updated', config);
    });

    // 消息队列事件
    this.messageQueue.on('message:processed', (messageId) => {
      this.logger.debug('Message processed', { messageId });
    });

    this.messageQueue.on('message:failed', (messageId, error) => {
      this.logger.error('Message processing failed', { messageId, error });
    });
  }

  /**
   * 创建实例（工厂方法）
   */
  public static async create(config: LocusMQConfig): Promise<LocusMQ> {
    const instance = new LocusMQ(config);
    await instance.start();
    return instance;
  }

  /**
   * 创建开发环境实例
   */
  public static async createDev(options?: any): Promise<LocusMQ> {
    const config = {
      database: {
        path: ':memory:',
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
      logger: {
        level: 'debug',
        format: 'pretty',
        outputs: ['console'],
      },
      ...options,
    };

    return this.create(config);
  }

  /**
   * 创建生产环境实例
   */
  public static async createProd(options?: any): Promise<LocusMQ> {
    const config = {
      database: {
        path: './data/locusmq.db',
        timeout: 10000,
        verbose: false,
      },
      queue: {
        maxRetries: 5,
        cleanupInterval: 300000,
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
      logger: {
        level: 'info',
        format: 'json',
        outputs: ['console', 'file'],
      },
      ...options,
    };

    return this.create(config);
  }
}

// 导出便利方法
export async function createLocusMQ(config: LocusMQConfig): Promise<LocusMQ> {
  return LocusMQ.create(config);
}

export async function createDevLocusMQ(options?: any): Promise<LocusMQ> {
  return LocusMQ.createDev(options);
}

export async function createProdLocusMQ(options?: any): Promise<LocusMQ> {
  return LocusMQ.createProd(options);
}