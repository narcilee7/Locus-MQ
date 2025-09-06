/**
 * 重试配置基础接口
 */
export interface BaseRetryConfig {
    /** 最大重试次数 */
    maxRetries?: number;
    
    /** 重试延迟倍数 */
    retryDelayMultiplier?: number;
    
    /** 初始重试延迟 (毫秒) */
    retryInitialDelay?: number;
}

/**
 * 超时配置基础接口
 */
export interface BaseTimeoutConfig {
    /** 处理超时时间 (毫秒) */
    processingTimeout?: number;
    
    /** 可见性超时时间 (毫秒) */
    visibilityTimeout?: number;
}

/**
 * 连接池配置
 */
export interface ConnectionPoolConfig {
    /** 最大连接数 */
    maxConnections?: number;
    
    /** 最小连接数 */
    minConnections?: number;
    
    /** 空闲超时时间 (毫秒) */
    idleTimeout?: number;
    
    /** 获取连接超时时间 (毫秒) */
    acquireTimeout?: number;
}