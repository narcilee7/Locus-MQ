export interface PerformanceConfig {
    batchSize?: number;
    flushInterval: number;
    maxConcurrency?: number;
    memoryLimit?: number;
    diskLimit?: number;
}
