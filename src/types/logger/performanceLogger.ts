import { LogMetadata } from "./context";

export interface PerformanceLogger {
    startTimer(name: string): void;
    endTimer(name: string, metadata?: LogMetadata): void;
    logMemoryUsage(metadata?: LogMetadata): void;
    logMetric(name: string, value: number, unit: string, metadata?: LogMetadata): void;
}