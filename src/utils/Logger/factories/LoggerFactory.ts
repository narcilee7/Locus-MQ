import { LoggerConfig, FileLogConfig, ConsoleLogConfig, HttpLogConfig } from '../../../types/logger/config';
import { LogFormat, LogLevel, LogOutput } from '../../../types/logger/enum';
import { LoggerBuilder } from '../builders/LoggerBuilder';
import { Logger } from '../Logger';

/**
 * 日志工厂配置
 */
export interface LoggerFactoryConfig {
  defaultLevel?: LogLevel;
  defaultFormat?: 'json' | 'text' | 'pretty';
  enableConsole?: boolean;
  enableFile?: boolean;
  filePath?: string;
  enableHttp?: boolean;
  httpUrl?: string;
}

/**
 * 日志工厂 - 工厂模式实现
 */
export class LoggerFactory {
  private static instance: LoggerFactory;
  private defaultConfig: LoggerFactoryConfig;

  private constructor() {
    this.defaultConfig = {
      defaultLevel: LogLevel.INFO,
      defaultFormat: 'json',
      enableConsole: true,
      enableFile: false,
      enableHttp: false,
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * 设置默认配置
   */
  public setDefaultConfig(config: LoggerFactoryConfig): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * 创建基础日志器
   */
  public createBasicLogger(name: string, level?: LogLevel): Logger {
    // const config: LoggerConfig = {
    //   level: level || this.defaultConfig.defaultLevel!,
    //   format: this.defaultConfig.defaultFormat as any,
    //   output: {
    //     console: { colors: true },
    //   },
    // };

    // return new Logger(name, config);
    // return new LoggerBuilder(name)
    //   .setLevel(level || this.defaultConfig.defaultLevel!)
    //   .setFormat(this.defaultConfig.defaultFormat as any);
  }

  /**
   * 创建开发环境日志器
   */
  public createDevLogger(name: string): Logger {
    return new LoggerBuilder(name)
      .setLevel(LogLevel.DEBUG)
      .enableConsole({ colors: true, showLevel: true })
      .enableFile({
        path: `./logs/${name}-dev.log`,
        maxSize: 1024 * 1024, // 1MB
        maxFiles: 3,
        rotation: 'daily',
      })
      .build();
  }

  /**
   * 创建生产环境日志器
   */
  public createProdLogger(name: string): Logger {
    return new LoggerBuilder(name)
      .setLevel(LogLevel.INFO)
      .enableConsole({ colors: false, showLevel: true })
      .enableFile({
        path: `./logs/${name}-prod.log`,
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        rotation: 'daily',
        compress: true,
      })
      .build();
  }

  /**
   * 创建测试日志器
   */
  public createTest(name: string): Logger {
    return new LoggerBuilder(name)
      .setLevel(LogLevel.TRACE)
      .enableConsole({ colors: true, showLevel: true })
      .build();
  }

  /**
   * 创建HTTP日志器
   */
  public createHttp(name: string, url: string): Logger {
    return new LoggerBuilder(name)
      .setLevel(LogLevel.INFO)
      .enableHttp({
        url,
        method: 'POST',
        timeout: 5000,
        retries: 3,
        batch: {
          enabled: true,
          size: 100,
          interval: 5000,
        },
      })
      .build();
  }

  /**
   * 创建JSON日志器
   */
  public createJson(name: string, filePath?: string): Logger {
    const builder = new LoggerBuilder(name)
      .setLevel(LogLevel.INFO)
      .setFormat(LogFormat.JSON);

    if (filePath) {
      builder.enableFile({
        path: filePath,
        maxSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5,
        rotation: 'size',
      });
    } else {
      builder.enableConsole();
    }

    return builder.build();
  }

  /**
   * 创建结构化日志器
   */
  public createStructured(name: string, config: {
    level?: LogLevel;
    console?: boolean;
    file?: FileLogConfig;
    http?: HttpLogConfig;
  } = {}): Logger {
    const builder = new LoggerBuilder(name)
      .setLevel(config.level || LogLevel.INFO)
      .setFormat(LogFormat.JSON);

    if (config.console !== false) {
      builder.enableConsole();
    }

    if (config.file) {
      builder.enableFile(config.file);
    }

    if (config.http) {
      builder.enableHttp(config.http);
    }

    return builder.build();
  }

  /**
   * 从环境变量创建日志器
   */
  public createFromEnv(name: string): Logger {
    const env = process.env;
    
    const level = this.parseLogLevel(env.LOG_LEVEL || 'INFO');
    const format = (env.LOG_FORMAT || 'json') as any;
    
    const builder = new LoggerBuilder(name)
      .setLevel(level)
      .setFormat(format);

    if (env.LOG_CONSOLE !== 'false') {
      builder.enableConsole({
        colors: env.LOG_COLORS !== 'false',
        showLevel: true,
      });
    }

    if (env.LOG_FILE_PATH) {
      builder.enableFile({
        path: env.LOG_FILE_PATH,
        maxSize: parseInt(env.LOG_FILE_MAX_SIZE || '10485760'), // 10MB
        maxFiles: parseInt(env.LOG_FILE_MAX_FILES || '5'),
        rotation: (env.LOG_FILE_ROTATION || 'daily') as any,
        compress: env.LOG_FILE_COMPRESS !== 'false',
      });
    }

    if (env.LOG_HTTP_URL) {
      builder.enableHttp({
        url: env.LOG_HTTP_URL,
        method: (env.LOG_HTTP_METHOD || 'POST') as any,
        timeout: parseInt(env.LOG_HTTP_TIMEOUT || '5000'),
        retries: parseInt(env.LOG_HTTP_RETRIES || '3'),
      });
    }

    return builder.build();
  }

  /**
   * 创建日志器构建器
   */
  public createBuilder(name: string): LoggerBuilder {
    return new LoggerBuilder(name);
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
    
    return levels[(level as string).toUpperCase()] || LogLevel.INFO;
  }
}

/**
 * 便利函数
 */
export const loggerFactory = LoggerFactory.getInstance();