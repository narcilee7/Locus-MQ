import { LogMetadata, LogContext } from "./context";

export interface Logger {
    trace(message: string, meta?: LogMetadata): void;
    debug(message: string, meta?: LogMetadata): void;
    info(message: string, meta?: LogMetadata): void;
    warn(message: string, meta?: LogMetadata): void;
    error(message: string, meta?: LogMetadata): void;
    fatal(message: string, meta?: LogMetadata): void;
    child(context: LogContext): Logger;
}