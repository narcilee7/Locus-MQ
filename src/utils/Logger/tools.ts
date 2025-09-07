import { Logger } from './Logger';
import { LogContext } from '../../types/logger/context';

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  stop(): number {
    this.endTime = Date.now();
    return this.getDuration();
  }

  getDuration(): number {
    return (this.endTime || Date.now()) - this.startTime;
  }

  getDurationMs(): string {
    return `${this.getDuration()}ms`;
  }

  getDurationSec(): string {
    return `${(this.getDuration() / 1000).toFixed(3)}s`;
  }
}

/**
 * 函数追踪器
 */
export class FunctionTracer {
  static trace<T extends (...args: any[]) => any>(
    logger: Logger,
    fn: T,
    context?: Partial<LogContext>
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const timer = new PerformanceTimer();
      const functionName = fn.name || 'anonymous';
      
      logger.debug(`Entering function: ${functionName}`, {
        ...context,
        function: functionName,
        arguments: args,
      });

      try {
        const result = fn(...args);
        
        if (result && typeof result.then === 'function') {
          // 处理异步函数
          return result
            .then((res: any) => {
              logger.debug(`Exiting async function: ${functionName}`, {
                ...context,
                function: functionName,
                duration: timer.getDurationMs(),
                result: res,
              });
              return res;
            })
            .catch((error: Error) => {
              logger.error(`Error in async function: ${functionName}`, error, {
                ...context,
                function: functionName,
                duration: timer.getDurationMs(),
              });
              throw error;
            }) as ReturnType<T>;
        } else {
          // 处理同步函数
          logger.debug(`Exiting function: ${functionName}`, {
            ...context,
            function: functionName,
            duration: timer.getDurationMs(),
            result,
          });
          return result;
        }
      } catch (error) {
        logger.error(`Error in function: ${functionName}`, error as Error, {
          ...context,
          function: functionName,
          duration: timer.getDurationMs(),
        });
        throw error;
      }
    }) as T;
  }
}

/**
 * 调试工具类
 */
export class DebugTools {
  static inspectObject(obj: any, depth = 2): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return `[Object inspection failed: ${error}]`;
    }
  }

  static getMemoryUsage(): string {
    const usage = process.memoryUsage();
    return {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`,
    } as any;
  }

  static getSystemInfo(): any {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memory: this.getMemoryUsage(),
      cpus: require('os').cpus().length,
    };
  }
}

/**
 * 日志装饰器
 */
export function LogMethod(
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' = 'info',
  context?: Partial<LogContext>
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const logger = (this as any).logger || console;
      const timer = new PerformanceTimer();
      
      logger[level](`Calling method: ${propertyKey}`, {
        ...context,
        class: target.constructor.name,
        method: propertyKey,
        arguments: args,
      });

      try {
        const result = originalMethod.apply(this, args);
        
        if (result && typeof result.then === 'function') {
          return result
            .then((res: any) => {
              logger[level](`Method completed: ${propertyKey}`, {
                ...context,
                class: target.constructor.name,
                method: propertyKey,
                duration: timer.getDurationMs(),
                result: res,
              });
              return res;
            })
            .catch((error: Error) => {
              logger.error(`Method failed: ${propertyKey}`, error, {
                ...context,
                class: target.constructor.name,
                method: propertyKey,
                duration: timer.getDurationMs(),
              });
              throw error;
            });
        } else {
          logger[level](`Method completed: ${propertyKey}`, {
            ...context,
            class: target.constructor.name,
            method: propertyKey,
            duration: timer.getDurationMs(),
            result,
          });
          return result;
        }
      } catch (error) {
        logger.error(`Method failed: ${propertyKey}`, error as Error, {
          ...context,
          class: target.constructor.name,
          method: propertyKey,
          duration: timer.getDurationMs(),
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 日志工具函数
 */
export class LogUtils {
  static createRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static sanitizeForLog(obj: any, sensitiveKeys = ['password', 'token', 'secret', 'key']): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj };
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLog(sanitized[key], sensitiveKeys);
      }
    }

    return sanitized;
  }

  static formatDuration(start: number, end?: number): string {
    const duration = (end || Date.now()) - start;
    
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(2)}s`;
    } else {
      return `${(duration / 60000).toFixed(2)}min`;
    }
  }
}

/**
 * 日志中间件工具
 */
export class LogMiddleware {
  static createRequestLogger(logger: Logger) {
    return (req: any, res: any, next: any) => {
      const requestId = LogUtils.createRequestId();
      const startTime = Date.now();
      
      // 添加到请求对象
      req.requestId = requestId;
      req.startTime = startTime;
      
      // 记录请求开始
      logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection?.remoteAddress,
      });

      // 监听响应完成
      const originalEnd = res.end;
      res.end = function (...args: any[]) {
        const duration = Date.now() - startTime;
        
        logger.info('Request completed', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: LogUtils.formatDuration(startTime),
          contentLength: res.getHeader('content-length'),
        });
        
        originalEnd.apply(this, args);
      };

      next();
    };
  }

  static createQueueLogger(logger: Logger) {
    return (queueName: string, operation: string, context?: any) => {
      const operationId = LogUtils.createCorrelationId();
      const startTime = Date.now();
      
      logger.info(`Queue operation started`, {
        operationId,
        queueName,
        operation,
        context: LogUtils.sanitizeForLog(context || {}),
      });

      return {
        complete: (result?: any) => {
          logger.info(`Queue operation completed`, {
            operationId,
            queueName,
            operation,
            duration: LogUtils.formatDuration(startTime),
            result: LogUtils.sanitizeForLog(result),
          });
        },
        error: (error: Error) => {
          logger.error(`Queue operation failed`, error, {
            operationId,
            queueName,
            operation,
            duration: LogUtils.formatDuration(startTime),
            context: LogUtils.sanitizeForLog(context || {}),
          });
        },
      };
    };
  }
}

// 默认导出
export default {
  PerformanceTimer,
  FunctionTracer,
  DebugTools,
  LogMethod,
  LogUtils,
  LogMiddleware,
};