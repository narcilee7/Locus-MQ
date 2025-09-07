import { LoggerConfig, FileLogConfig, ConsoleLogConfig, HttpLogConfig } from '../../../types/logger/config';
import { LogLevel, LogFormat } from '../../../types/logger/enum';
import { Logger } from '../Logger';

/**
 * 日志构建器 - 构建者模式实现
 */
export class LoggerBuilder {
  private name: string;
  private config: Partial<LoggerConfig> = {};

  constructor(name: string) {
    this.name = name;
    this.config = {
      level: LogLevel.INFO,
      format: LogFormat.JSON,
      output: {},
    };
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): this {
    this.config.level = level;
    return this;
  }

  /**
   * 设置日志格式
   */
  setFormat(format: LogFormat): this {
    this.config.format = format;
    return this;
  }

  /**
   * 启用控制台输出
   */
  enableConsole(config?: ConsoleLogConfig): this {
    this.config.output = {
      ...this.config.output,
      console: {
        colors: true,
        showLevel: true,
        showNamespace: true,
        timestampFormat: 'ISO',
        ...config,
      },
    };
    return this;
  }

  /**
   * 启用文件输出
   */
  enableFile(config: FileLogConfig): this {
    this.config.output = {
      ...this.config.output,
      file: {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        compress: false,
        rotation: 'daily',
        ...config,
      },
    };
    return this;
  }

  /**
   * 启用HTTP输出
   */
  enableHttp(config: HttpLogConfig): this {
    this.config.output = {
      ...this.config.output,
      http: {
        method: 'POST',
        timeout: 5000,
        retries: 3,
        batch: {
          enabled: false,
        },
        ...config,
      },
    };
    return this;
  }

  /**
   * 设置异步模式
   */
  setAsync(async: boolean = true): this {
    this.config.async = async;
    return this;
  }

  /**
   * 设置缓冲区大小
   */
  setBufferSize(size: number): this {
    this.config.bufferSize = size;
    return this;
  }

  /**
   * 设置刷新间隔
   */
  setFlushInterval(interval: number): this {
    this.config.flushInterval = interval;
    return this;
  }

  /**
   * 添加过滤器
   */
  addFilter(filter: {
    minLevel?: LogLevel;
    include?: string[];
    exclude?: string[];
    sampling?: number;
  }): this {
    if (!this.config.filters) {
      this.config.filters = [];
    }
    this.config.filters.push(filter);
    return this;
  }

  /**
   * 设置上下文
   */
  setContext(context: Record<string, any>): this {
    this.config.context = { ...this.config.context, ...context };
    return this;
  }

  /**
   * 添加上下文字段
   */
  addContext(key: string, value: any): this {
    if (!this.config.context) {
      this.config.context = {};
    }
    this.config.context[key] = value;
    return this;
  }

  /**
   * 启用日志轮转
   */
  enableRotation(config: {
    enabled: boolean;
    interval?: number;
    maxSize?: number;
  }): this {
    this.config.rotation = config;
    return this;
  }

  /**
   * 设置开发环境配置
   */
  forDevelopment(): this {
    return this
      .setLevel(LogLevel.DEBUG)
      .enableConsole({
        colors: true,
        showLevel: true,
        showNamespace: true,
      })
      .enableFile({
        path: `./logs/${this.name}-dev.log`,
        maxSize: 1024 * 1024, // 1MB
        maxFiles: 3,
        rotation: 'daily',
      })
      .setAsync(false)
      .setBufferSize(100);
  }

  /**
   * 设置生产环境配置
   */
  forProduction(): this {
    return this
      .setLevel(LogLevel.INFO)
      .enableConsole({
        colors: false,
        showLevel: true,
        showNamespace: false,
      })
      .enableFile({
        path: `./logs/${this.name}-prod.log`,
        maxSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
        rotation: 'daily',
        compress: true,
      })
      .setAsync(true)
      .setBufferSize(1000)
      .setFlushInterval(5000);
  }

  /**
   * 设置测试环境配置
   */
  forTesting(): this {
    return this
      .setLevel(LogLevel.TRACE)
      .enableConsole({
        colors: true,
        showLevel: true,
        showNamespace: true,
      })
      .setAsync(false)
      .setBufferSize(50);
  }

  /**
   * 从环境变量配置
   */
  fromEnvironment(): this {
    const env = process.env;
    
    if (env.LOG_LEVEL) {
      this.setLevel(this.parseLogLevel(env.LOG_LEVEL));
    }
    
    if (env.LOG_FORMAT) {
      this.setFormat(this.parseLogFormat(env.LOG_FORMAT));
    }
    
    if (env.LOG_CONSOLE !== 'false') {
      this.enableConsole({
        colors: env.LOG_COLORS !== 'false',
        showLevel: true,
      });
    }
    
    if (env.LOG_FILE_PATH) {
      this.enableFile({
        path: env.LOG_FILE_PATH,
        maxSize: parseInt(env.LOG_FILE_MAX_SIZE || '10485760'),
        maxFiles: parseInt(env.LOG_FILE_MAX_FILES || '5'),
        rotation: (env.LOG_FILE_ROTATION || 'daily') as any,
        compress: env.LOG_FILE_COMPRESS !== 'false',
      });
    }
    
    if (env.LOG_HTTP_URL) {
      this.enableHttp({
        url: env.LOG_HTTP_URL,
        method: (env.LOG_HTTP_METHOD || 'POST') as any,
        timeout: parseInt(env.LOG_HTTP_TIMEOUT || '5000'),
        retries: parseInt(env.LOG_HTTP_RETRIES || '3'),
      });
    }
    
    return this;
  }

  /**
   * 构建日志器
   */
  build(): Logger {
    const config: LoggerConfig = {
      level: LogLevel.INFO,
      format: LogFormat.JSON,
      output: {},
      async: false,
      bufferSize: 1000,
      flushInterval: 5000,
      ...this.config,
    };
    
    return new Logger(this.name, config);
  }

  /**
   * 克隆构建器
   */
  clone(): LoggerBuilder {
    const builder = new LoggerBuilder(this.name);
    builder.config = { ...this.config };
    return builder;
  }

  /**
   * 解析日志级别
   */
  private parseLogLevel(level: string): LogLevel {
    const levels = {
      'TRACE': LogLevel.TRACE,
      'DEBUG': LogLevel.DEBUG,
      'INFO': LogLevel.INFO,
      'WARN': LogLevel.WARN,
      'ERROR': LogLevel.ERROR,
      'FATAL': LogLevel.FATAL,
    };
    return levels[level.toUpperCase()] || LogLevel.INFO;
  }

  /**
   * 解析日志格式
   */
  private parseLogFormat(format: string): LogFormat {
    const formats = {
      'JSON': LogFormat.JSON,
      'TEXT': LogFormat.TEXT,
      'PRETTY': LogFormat.PRETTY,
    };
    return formats[format.toUpperCase()] || LogFormat.JSON;
  }
}