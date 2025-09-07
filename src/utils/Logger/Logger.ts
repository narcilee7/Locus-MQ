// import { LoggerConfig } from '../../../types/logger/config';
import { LogLevel, LogFormat } from '../../../types/logger/enum';
// import { LogContext } from '../../../types/logger/context';
// import { LogEntry } from '../../../types/logger/middleware';
import { ConsoleHandler } from './handlers/ConsoleHandler';
import { FileHandler } from './handlers/FileHandler';
import { BaseHandler } from './handlers/BaseHandler';
import { LogContext, LoggerConfig } from '../../types';
import { LogEntry } from '../Logger';

/**
 * 日志记录器主类
 */
export class Logger {
  private name: string;
  private config: LoggerConfig;
  private handlers: BaseHandler[] = [];
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isFlushing = false;
  private context: LogContext;

  constructor(name: string, config: LoggerConfig) {
    this.name = name;
    this.config = config;
    this.context = {
      namespace: name,
      timestamp: new Date().toISOString(),
      ...config.context,
    };

    this.initializeHandlers();
    this.startFlushTimer();
  }

  /**
   * 初始化处理器
   */
  private initializeHandlers(): void {
    if (this.config.output.console) {
      this.handlers.push(new ConsoleHandler(this.config.output.console));
    }

    if (this.config.output.file) {
      this.handlers.push(new FileHandler(this.config.output.file));
    }
  }

  /**
   * 启动刷新定时器
   */
  private startFlushTimer(): void {
    if (this.config.async && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  /**
   * 停止刷新定时器
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, message: string, context?: Partial<LogContext>): void {
    const entry = this.createLogEntry(level, message, context);

    if (this.shouldLog(entry)) {
      if (this.config.async) {
        this.buffer.push(entry);
        if (this.buffer.length >= this.config.bufferSize) {
          this.flush();
        }
      } else {
        this.processLogEntry(entry);
      }
    }
  }

  /**
   * 创建日志条目
   */
  private createLogEntry(level: LogLevel, message: string, context?: Partial<LogContext>): LogEntry {
    const timestamp = new Date();
    const mergedContext: LogContext = {
      ...this.context,
      ...context,
      timestamp: timestamp.toISOString(),
    };

    return {
      level,
      message,
      timestamp: timestamp.getTime(),
      context: mergedContext,
    };
  }

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(entry: LogEntry): boolean {
    if (entry.level < this.config.level) {
      return false;
    }

    if (this.config.filters) {
      for (const filter of this.config.filters) {
        if (filter.minLevel && entry.level < filter.minLevel) {
          continue;
        }

        if (filter.include && filter.include.length > 0) {
          const matches = filter.include.some(pattern =>
            this.matchesPattern(entry.context.namespace, pattern)
          );
          if (!matches) continue;
        }

        if (filter.exclude && filter.exclude.length > 0) {
          const matches = filter.exclude.some(pattern =>
            this.matchesPattern(entry.context.namespace, pattern)
          );
          if (matches) continue;
        }

        if (filter.sampling && Math.random() > filter.sampling) {
          continue;
        }

        return true;
      }
    }

    return true;
  }

  /**
   * 模式匹配
   */
  private matchesPattern(text: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(text);
    }
    return text === pattern;
  }

  /**
   * 处理日志条目
   */
  private processLogEntry(entry: LogEntry): void {
    for (const handler of this.handlers) {
      handler.handle(entry);
    }
  }

  /**
   * 刷新缓冲区
   */
  private async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    const entries = [...this.buffer];
    this.buffer = [];

    try {
      for (const entry of entries) {
        this.processLogEntry(entry);
      }
    } catch (error) {
      console.error('Error flushing logs:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * 强制刷新所有日志
   */
  async flushAll(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.flush();
    }
  }

  /**
   * 关闭日志器
   */
  async close(): Promise<void> {
    this.stopFlushTimer();
    await this.flushAll();

    for (const handler of this.handlers) {
      if (handler.close) {
        await handler.close();
      }
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.reinitializeHandlers();
  }

  /**
   * 重新初始化处理器
   */
  private reinitializeHandlers(): void {
    this.handlers = [];
    this.initializeHandlers();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    bufferSize: number;
    handlers: number;
    level: LogLevel;
    isAsync: boolean;
  } {
    return {
      bufferSize: this.buffer.length,
      handlers: this.handlers.length,
      level: this.config.level,
      isAsync: this.config.async,
    };
  }

  // 快捷方法
  trace(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  debug(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Partial<LogContext>): void {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack,
    };
    this.log(LogLevel.ERROR, message, errorContext);
  }

  fatal(message: string, error?: Error, context?: Partial<LogContext>): void {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack,
    };
    this.log(LogLevel.FATAL, message, errorContext);
  }

  /**
   * 创建子日志器
   */
  createChild(name: string): Logger {
    const childContext = {
      ...this.context,
      namespace: `${this.name}:${name}`,
    };

    const childConfig = {
      ...this.config,
      context: childContext,
    };

    return new Logger(`${this.name}:${name}`, childConfig);
  }
}