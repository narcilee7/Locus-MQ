import { LogContext, LogMetadata } from "./context";
import { LogLevel } from "./enum";

export interface LogEntry {
    /** 时间戳 */
    timestamp: Date;
    /** 日志级别 */
    level: LogLevel;
    /** 日志消息 */
    message: string;
    /** 命名空间/模块名 */
    namespace: string;
    /** 上下文信息 */
    context?: LogContext;
    /** 元数据 */
    meta?: LogMetadata;
    /** 错误信息 */
    error?: Error;
}

export interface LogMiddleware {
    process(log: LogEntry): LogEntry | Promise<LogEntry>;
}