import { EventEmitter } from 'events';
import { LoggerConfig } from '../types/logger';
import { LogLevel, LogFormat, LogOutput } from '../types/logger/enum';

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  error?: Error;
  correlationId?: string;
}

/**
 * 日志处理器接口
 */
export interface LogHandler {
  handle(entry: LogEntry): Promise<void>;
  close?(): Promise<void>;
}

/**
 * 控制台日志处理器
 */
class ConsoleHandler implements LogHandler {
  async handle(entry: LogEntry): Promise<void> {
    const output = this.formatEntry(entry);
    
    switch (entry.level) {
      case LogLevel.TRACE:
        console.trace(output);
        break;
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.FATAL:
        console.error(`[FATAL] ${output}`);
        break;
    }
  }

  private formatEntry(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].toUpperCase().padEnd(5);
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const error = entry.error ? `\n${entry.error.stack}` : '';
    
    return `[${time}] ${level} ${entry.message}${context}${error}`;
  }
}

/**
 * 文件日志处理器
 */
class FileHandler implements LogHandler {
  private fs: any;
  private path: any;
  private writeStream: any;

  constructor(private filePath: string) {
    this.fs = require('fs');
    this.path = require('path');
    this.ensureDirectoryExists();
    this.writeStream = this.fs.createWriteStream(this.filePath, { flags: 'a' });
  }

  async handle(entry: LogEntry): Promise<void> {
    const output = this.formatEntry(entry);
    this.writeStream.write(output + '\n');
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.writeStream.end(resolve);
    });
  }

  private formatEntry(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].toUpperCase();
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const error = entry.error ? ` ${entry.error.message}` : '';
    
    return JSON.stringify({
      timestamp: time,
      level,
      message: entry.message,
      context,
      error: entry.error?.message,
      stack: entry.error?.stack,
      correlationId: entry.correlationId,
    });
  }

  private ensureDirectoryExists(): void {
    const dir = this.path.dirname(this.filePath);
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * 内存日志处理器（用于测试）
 */
class MemoryHandler implements LogHandler {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  async handle(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
    
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * 生产级日志器
 */
export class Logger extends EventEmitter {
  private config: LoggerConfig;
  private handlers: Map<LogOutput, LogHandler> = new Map();
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private correlationId: string | null = null;

  constructor(config: LoggerConfig) {
    super();
    this.config = {
      level: LogLevel.INFO,
      format: LogFormat.JSON,
      outputs: [LogOutput.CONSOLE],
      enableAsync: true,
      bufferSize: 1000,
      flushInterval: 1000,
      enableSampling: false,
      samplingRate: 0.1,
      ...config,
    };

    this.setupHandlers();
    this.startFlushTimer();
  }

  /**
   * 设置日志处理器
   */
  private setupHandlers(): void {
    this.handlers.clear();

    for (const output of this.config.outputs) {
      switch (output) {
        case LogOutput.CONSOLE:
          this.handlers.set(output, new ConsoleHandler());
          break;
        case LogOutput.FILE:
          if (this.config.filePath) {
            this.handlers.set(output, new FileHandler(this.config.filePath));
          }
          break;
        case LogOutput.STREAM:
          // 可以添加自定义流处理器
          break;
      }
    }
  }

  /**
   * 设置相关ID
   */
  public setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * 清除相关ID
   */
  public clearCorrelationId(): void {
    this.correlationId = null;
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      error,
      correlationId: this.correlationId || undefined,
    };

    if (this.config.enableAsync) {
      this.buffer.push(entry);
      
      if (this.buffer.length >= this.config.bufferSize!) {
        this.flush();
      }
    } else {
      this.processEntry(entry);
    }

    this.emit('log', entry);
  }

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.config.enableSampling && Math.random() > this.config.samplingRate!) {
      return false;
    }

    return level >= this.config.level;
  }

  /**
   * 处理日志条目
   */
  private async processEntry(entry: LogEntry): Promise<void> {
    const promises = Array.from(this.handlers.values()).map(handler => 
      handler.handle(entry).catch(error => {
        console.error('Log handler error:', error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * 刷新日志缓冲区
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = this.buffer.splice(0);
    const promises = entries.map(entry => this.processEntry(entry));

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Error flushing logs:', error);
    }
  }

  /**
   * 启动刷新定时器
   */
  private startFlushTimer(): void {
    if (this.config.enableAsync && this.config.flushInterval) {
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
      this.flushTimer = null;
    }
  }

  /**
   * 关闭日志器
   */
  public async close(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();

    const promises = Array.from(this.handlers.values())
      .map(handler => handler.close?.() || Promise.resolve());

    await Promise.all(promises);
  }

  // 日志级别方法
  public trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, context, error);
    } else {
      this.log(LogLevel.ERROR, message, { ...context, ...error });
    }
  }

  public fatal(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void {
    if (error instanceof Error) {
      this.log(LogLevel.FATAL, message, context, error);
    } else {
      this.log(LogLevel.FATAL, message, { ...context, ...error });
    }
  }

  /**
   * 创建子日志器
   */
  public child(context: Record<string, any>): Logger {
    const childConfig = {
      ...this.config,
      context: { ...this.config.context, ...context },
    };

    const child = new Logger(childConfig);
    child.handlers = this.handlers;
    return child;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.setupHandlers();
  }

  /**
   * 获取当前日志级别
   */
  public getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * 设置日志级别
   */
  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 创建内存日志器（用于测试）
   */
  public static createMemoryLogger(maxSize = 1000): { logger: Logger; getLogs: () => LogEntry[] } {
    const handler = new MemoryHandler(maxSize);
    const logger = new Logger({
      level: LogLevel.DEBUG,
      outputs: [LogOutput.STREAM],
    });
    
    logger.handlers.set(LogOutput.STREAM, handler);
    
    return {
      logger,
      getLogs: () => handler.getLogs(),
    };
  }
}