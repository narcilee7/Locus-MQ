import { LogMetadata } from "./context";

export interface AuditLogger {
    logUserAction(action: string, metadata?: LogMetadata): void;
    logSystemEvent(event: string, metadata?: LogMetadata): void;
    logDataChange(operation: string, before: any, after: any, metadata?: LogMetadata): void;
}