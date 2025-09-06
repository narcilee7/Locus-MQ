import { BaseRetryConfig, BaseTimeoutConfig } from "../shared";

/**
 * 消费者全局配置
 */
export interface ConsumerGlobalConfig {
    /** 默认消费者ID */
    defaultConsumerId?: string;
    
    /** 全局默认配置 */
    defaults?: ConsumerDefaults;
    
    /** 连接池配置 */
    pool?: ConnectionPoolConfig;
}

/**
 * 消费者默认配置
 */
export interface ConsumerDefaults extends BaseRetryConfig, BaseTimeoutConfig {
    /** 轮询间隔 (ms) */
    pollInterval?: number;
    
    /** 最大并发数 */
    maxConcurrency?: number;
    
    /** 批处理大小 */
    batchSize?: number;
    
    /** 是否启用自动重试 */
    autoRetry?: boolean;
    
    /** 死信队列配置 */
    deadLetterQueue?: {
        enabled?: boolean;
        maxRetries?: number;
    };
}

/**
 * 连接池配置
 */
export interface ConnectionPoolConfig {
    maxConnections?: number;
    minConnections?: number;
    idleTimeout?: number;
    acquireTimeout?: number;
}