import { BaseHandler, LogFormatter, PrettyFormatter } from './BaseHandler';
import { LogEntry } from '../../../types/logger/middleware';

/**
 * 控制台日志处理器配置
 */
export interface ConsoleHandlerConfig {
  colors?: boolean;
  timestampFormat?: string;
  showLevel?: boolean;
  showNamespace?: boolean;
}

/**
 * 控制台日志处理器
 */
export class ConsoleHandler extends BaseHandler {
  private config: ConsoleHandlerConfig;

  constructor(level: number = 0, config: ConsoleHandlerConfig = {}, formatter?: LogFormatter) {
    super(level, formatter || (config.colors ? new PrettyFormatter() : new TextFormatter()));
    this.config = {
      colors: true,
      showLevel: true,
      showNamespace: true,
      ...config,
    };
  }

  async process(entry: LogEntry): Promise<void> {
    const output = this.formatter.format(entry);
    
    switch (entry.level) {
      case 0: // TRACE
        console.trace(output);
        break;
      case 1: // DEBUG
        console.debug(output);
        break;
      case 2: // INFO
        console.info(output);
        break;
      case 3: // WARN
        console.warn(output);
        break;
      case 4: // ERROR
        console.error(output);
        break;
      case 5: // FATAL
        console.error(`[FATAL] ${output}`);
        break;
      default:
        console.log(output);
    }
  }
}

/**
 * 文本格式化器（控制台用）
 */
class TextFormatter implements LogFormatter {
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