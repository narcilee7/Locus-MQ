export interface MonitoringConfig {
    enableMetrics?: boolean;
    metricsInterval?: number;
    enableTracing?: boolean;
    samplingRate?: number;
}