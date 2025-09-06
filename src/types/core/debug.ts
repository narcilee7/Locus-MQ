import { LogLevel } from "../logger/enum";

/**
 * 调试配置接口
 */
export interface DebugConfig {
    /** 是否启用调试模式 */
    enableDebug?: boolean;
    
    /** 调试日志级别 */
    logLevel?: LogLevel;
    
    /** 调试日志文件路径 */
    logFile?: string;
    
    /** 是否启用性能分析 */
    enableProfiling?: boolean;
    
    /** 性能分析配置 */
    profiling?: {
        /** 采样间隔 (毫秒) */
        samplingInterval?: number;
        /** 最大采样记录数 */
        maxRecords?: number;
        /** 输出文件路径 */
        outputFile?: string;
    };
    
    /** 调试钩子配置 */
    hooks?: {
        /** 消息处理前后钩子 */
        onMessageProcessing?: boolean;
        /** 队列操作钩子 */
        onQueueOperation?: boolean;
        /** 连接池状态钩子 */
        onConnectionPoolStatus?: boolean;
    };
    
    /** 详细调试信息 */
    verbose?: {
        /** 记录消息详情 */
        messageDetails?: boolean;
        /** 记录性能指标 */
        performanceMetrics?: boolean;
        /** 记录内存使用 */
        memoryUsage?: boolean;
    };
}
