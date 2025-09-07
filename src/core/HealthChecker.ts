import { EventEmitter } from 'events';
import { DatabaseManager } from './DatabaseManager';
import { PerformanceMonitor } from './PerformanceMonitor';

/**
 * 健康检查状态
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * 健康检查组件
 */
export interface HealthComponent {
  name: string;
  status: HealthStatus;
  message?: string;
  lastCheck: number;
  responseTime?: number;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: number;
  uptime: number;
  components: HealthComponent[];
  details: Record<string, any>;
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  components: {
    database: boolean;
    memory: boolean;
    disk: boolean;
    queue: boolean;
    performance: boolean;
  };
  thresholds: {
    memoryUsage: number;
    diskUsage: number;
    responseTime: number;
    errorRate: number;
    queueSize: number;
  };
}

/**
 * 生产级健康检查器
 */
export class HealthChecker extends EventEmitter {
  private config: HealthCheckConfig;
  private databaseManager: DatabaseManager;
  private performanceMonitor: PerformanceMonitor;
  private checkTimer: NodeJS.Timeout | null = null;
  private lastResult: HealthCheckResult | null = null;
  private isRunning = false;

  constructor(
    config: Partial<HealthCheckConfig>,
    databaseManager: DatabaseManager,
    performanceMonitor: PerformanceMonitor
  ) {
    super();
    
    this.config = {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 5000,
      retries: 3,
      components: {
        database: true,
        memory: true,
        disk: true,
        queue: true,
        performance: true,
      },
      thresholds: {
        memoryUsage: 0.8,
        diskUsage: 0.9,
        responseTime: 5000,
        errorRate: 0.05,
        queueSize: 10000,
      },
      ...config,
    };

    this.databaseManager = databaseManager;
    this.performanceMonitor = performanceMonitor;
  }

  /**
   * 开始健康检查
   */
  public start(): void {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;
    this.checkTimer = setInterval(() => {
      this.performHealthCheck().catch(error => {
        this.emit('error', error);
      });
    }, this.config.interval);

    this.emit('started');
  }

  /**
   * 停止健康检查
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    this.emit('stopped');
  }

  /**
   * 执行健康检查
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const components: HealthComponent[] = [];
    const details: Record<string, any> = {};

    try {
      // 数据库健康检查
      if (this.config.components.database) {
        components.push(await this.checkDatabaseHealth());
      }

      // 内存健康检查
      if (this.config.components.memory) {
        components.push(await this.checkMemoryHealth());
      }

      // 磁盘健康检查
      if (this.config.components.disk) {
        components.push(await this.checkDiskHealth());
      }

      // 队列健康检查
      if (this.config.components.queue) {
        components.push(await this.checkQueueHealth());
      }

      // 性能健康检查
      if (this.config.components.performance) {
        components.push(await this.checkPerformanceHealth());
      }

      // 确定整体状态
      const status = this.determineOverallStatus(components);
      
      const result: HealthCheckResult = {
        status,
        timestamp: Date.now(),
        uptime: process.uptime() * 1000,
        components,
        details,
      };

      this.lastResult = result;
      this.emit('health:check', result);

      // 如果状态不健康，发出警报
      if (status !== HealthStatus.HEALTHY) {
        this.emit('alert:unhealthy', result);
      }

      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        status: HealthStatus.UNHEALTHY,
        timestamp: Date.now(),
        uptime: process.uptime() * 1000,
        components,
        details: { error: error.message },
      };

      this.lastResult = result;
      this.emit('error', error);
      return result;
    }
  }

  /**
   * 检查数据库健康
   */
  private async checkDatabaseHealth(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      // 检查数据库连接
      const isConnected = await this.databaseManager.healthCheck();
      const responseTime = Date.now() - startTime;

      if (!isConnected) {
        return {
          name: 'database',
          status: HealthStatus.UNHEALTHY,
          message: 'Database connection failed',
          lastCheck: Date.now(),
          responseTime,
        };
      }

      if (responseTime > this.config.thresholds.responseTime) {
        return {
          name: 'database',
          status: HealthStatus.DEGRADED,
          message: `High response time: ${responseTime}ms`,
          lastCheck: Date.now(),
          responseTime,
        };
      }

      return {
        name: 'database',
        status: HealthStatus.HEALTHY,
        message: 'Database is healthy',
        lastCheck: Date.now(),
        responseTime,
      };
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        message: `Database error: ${error.message}`,
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查内存健康
   */
  private async checkMemoryHealth(): Promise<HealthComponent> {
    const memUsage = process.memoryUsage();
    const heapUsedRatio = memUsage.heapUsed / memUsage.heapTotal;

    if (heapUsedRatio > this.config.thresholds.memoryUsage) {
      return {
        name: 'memory',
        status: HealthStatus.DEGRADED,
        message: `High memory usage: ${Math.round(heapUsedRatio * 100)}%`,
        lastCheck: Date.now(),
      };
    }

    return {
      name: 'memory',
      status: HealthStatus.HEALTHY,
      message: `Memory usage: ${Math.round(heapUsedRatio * 100)}%`,
      lastCheck: Date.now(),
    };
  }

  /**
   * 检查磁盘健康
   */
  private async checkDiskHealth(): Promise<HealthComponent> {
    try {
      // 简单的磁盘检查 - 在实际实现中会检查实际磁盘使用情况
      const fs = require('fs');
      const stats = fs.statSync(process.cwd());
      
      return {
        name: 'disk',
        status: HealthStatus.HEALTHY,
        message: 'Disk access OK',
        lastCheck: Date.now(),
      };
    } catch (error) {
      return {
        name: 'disk',
        status: HealthStatus.UNHEALTHY,
        message: `Disk error: ${error.message}`,
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * 检查队列健康
   */
  private async checkQueueHealth(): Promise<HealthComponent> {
    try {
      const queueStats = this.performanceMonitor.getQueueStats();
      let totalMessages = 0;
      
      queueStats.forEach((stats) => {
        totalMessages += stats.pendingMessages;
      });

      if (totalMessages > this.config.thresholds.queueSize) {
        return {
          name: 'queue',
          status: HealthStatus.DEGRADED,
          message: `High queue backlog: ${totalMessages} messages`,
          lastCheck: Date.now(),
        };
      }

      return {
        name: 'queue',
        status: HealthStatus.HEALTHY,
        message: `Queue backlog: ${totalMessages} messages`,
        lastCheck: Date.now(),
      };
    } catch (error) {
      return {
        name: 'queue',
        status: HealthStatus.UNHEALTHY,
        message: `Queue error: ${error.message}`,
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * 检查性能健康
   */
  private async checkPerformanceHealth(): Promise<HealthComponent> {
    try {
      const summary = this.performanceMonitor.getPerformanceSummary();
      const errorRate = summary.recentMetrics.errorRate;

      if (errorRate > this.config.thresholds.errorRate) {
        return {
          name: 'performance',
          status: HealthStatus.DEGRADED,
          message: `High error rate: ${Math.round(errorRate * 100)}%`,
          lastCheck: Date.now(),
        };
      }

      return {
        name: 'performance',
        status: HealthStatus.HEALTHY,
        message: `Error rate: ${Math.round(errorRate * 100)}%`,
        lastCheck: Date.now(),
      };
    } catch (error) {
      return {
        name: 'performance',
        status: HealthStatus.UNHEALTHY,
        message: `Performance error: ${error.message}`,
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * 确定整体状态
   */
  private determineOverallStatus(components: HealthComponent[]): HealthStatus {
    const unhealthy = components.filter(c => c.status === HealthStatus.UNHEALTHY);
    const degraded = components.filter(c => c.status === HealthStatus.DEGRADED);

    if (unhealthy.length > 0) {
      return HealthStatus.UNHEALTHY;
    }

    if (degraded.length > 0) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * 获取最后一次检查结果
   */
  public getLastResult(): HealthCheckResult | null {
    return this.lastResult;
  }

  /**
   * 获取健康状态
   */
  public getStatus(): HealthStatus {
    return this.lastResult?.status || HealthStatus.UNKNOWN;
  }

  /**
   * 获取组件状态
   */
  public getComponentStatus(componentName: string): HealthComponent | undefined {
    return this.lastResult?.components.find(c => c.name === componentName);
  }

  /**
   * 检查特定组件是否健康
   */
  public isComponentHealthy(componentName: string): boolean {
    const component = this.getComponentStatus(componentName);
    return component?.status === HealthStatus.HEALTHY;
  }

  /**
   * 获取健康检查摘要
   */
  public getHealthSummary(): any {
    if (!this.lastResult) {
      return {
        status: HealthStatus.UNKNOWN,
        message: 'No health check performed yet',
      };
    }

    return {
      status: this.lastResult.status,
      uptime: this.lastResult.uptime,
      lastCheck: this.lastResult.timestamp,
      components: this.lastResult.components.reduce((acc, component) => {
        acc[component.name] = {
          status: component.status,
          message: component.message,
          responseTime: component.responseTime,
        };
        return acc;
      }, {} as Record<string, any>),
    };
  }

  /**
   * 生成健康报告
   */
  public generateReport(): string {
    return JSON.stringify(this.getHealthSummary(), null, 2);
  }
}