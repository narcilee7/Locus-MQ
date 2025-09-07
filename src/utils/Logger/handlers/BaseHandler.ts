import { LogEntry } from '../../types/logger/middleware';
import { LogHandler } from '../Logger';

/**
 * 基础日志处理器抽象类
 */
export abstract class BaseHandler implements LogHandler {
  protected level: number;
  protected formatter: LogFormatter;

  constructor(level: number = 0, formatter?: LogFormatter) {
    this.level = level;
    this.formatter = formatter || new JsonFormatter();
  }

  async handle(entry: LogEntry): Promise<void> {
    if (entry.level >= this.level) {
      await this.process(entry);
    }
  }

  abstract process(entry: LogEntry): Promise<void>;

  async close?(): Promise<void> {
    // 子类可以重写此方法进行清理
  }
}

/**
 * 日志格式化器接口
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
}

/**
 * JSON格式化器
 */
export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      namespace: entry.namespace,
      context: entry.context,
      meta: entry.meta,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : undefined,
    });
  }
}

/**
 * 文本格式化器
 */
export class TextFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const time = entry.timestamp.toISOString();
    const level = this.getLevelName(entry.level);
    const namespace = entry.namespace ? `[${entry.namespace}] ` : '';
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const error = entry.error ? `\n${entry.error.stack || entry.error.message}` : '';
    
    return `${time} [${level}] ${namespace}${entry.message}${context}${error}`;
  }

  private getLevelName(level: number): string {
    const names = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return names[level] || 'UNKNOWN';
  }
}

/**
 * 美观格式化器
 */
export class PrettyFormatter implements LogFormatter {
  private colors = {
    0: '\x1b[90m',   // TRACE - gray
    1: '\x1b[36m',   // DEBUG - cyan
    2: '\x1b[32m',   // INFO - green
    3: '\x1b[33m',   // WARN - yellow
    4: '\x1b[31m',   // ERROR - red
    5: '\x1b[35m',   // FATAL - magenta
  };

  private reset = '\x1b[0m';

  format(entry: LogEntry): string {
    const time = entry.timestamp.toISOString();
    const levelName = this.getLevelName(entry.level);
    const color = this.colors[entry.level] || '';
    const namespace = entry.namespace ? ` ${entry.namespace}` : '';
    const context = entry.context ? ` ${JSON.stringify(entry.context, null, 2)}` : '';
    const error = entry.error ? `\n  ${entry.error.stack || entry.error.message}` : '';
    
    return `${color}${time} ${levelName}${namespace}: ${entry.message}${context}${error}${this.reset}`;
  }

  private getLevelName(level: number): string {
    const names = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return names[level] || 'UNKNOWN';
  }
}