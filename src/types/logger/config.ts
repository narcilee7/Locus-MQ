import { LogContext } from "./context";
import { LogFormat, LogLevel } from "./enum";

export interface FileLogConfig {
    path: string;
    // bytes
    maxSize?: number;
    maxFiles?: number;
    compress?: boolean;
    rotation?:
        | 'daily'
        | 'weekly'
        | 'monthly'
        | 'size';
}

export interface HttpLogConfig {
    url: string;
    method?: 'POST' | 'PUT' | 'PATCH';
    header?: Record<string, string>;
    timeout?: number;
    retries?: number;
    batch?: {
        enabled: boolean;
        size?: number;
        interval?: number;
    }
}

export interface ConsoleLogConfig {
    colors?: boolean;
    timestampFormat?: string;
    showLevel?: boolean;
}

export interface LogFilter {
    minLevel?: LogLevel;
    include?: string[];
    exclude?: string[];
    samplig?: number;
}

export interface LoggerConfig {
    level: LogLevel;
    format: LogFormat;
    output: {
        console?: ConsoleLogConfig;
        file?: FileLogConfig;
        http?: HttpLogConfig;
    }
    filters?: LogFilter[];
    context?: LogContext;
    async?: boolean;
    bufferSize?: number;
    rotation?: {
        enabled: boolean;
        interval?: number;
        maxSize?: number;
    }
}