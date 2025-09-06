import { BaseRetryConfig, BaseTimeoutConfig } from "../shared";

/**
 * 队列全局配置
 */
export interface QueueGlobalConfig extends BaseRetryConfig, BaseTimeoutConfig {
    /** 默认清理间隔 (毫秒) */
    cleanupInterval?: number;
    
    /** 默认最大并发数 */
    maxConcurrency?: number;
    
    /** 死信队列全局配置 */
    deadLetterQueue?: {
        enabled?: boolean;
        queueName?: string;
        maxRetries?: number;
    };
    
    /** 消息保留策略 */
    retention?: {
        maxMessageAge?: number;
        retentionTime?: number;
        cleanupBatchSize?: number;
    };
    
    /** 消息去重配置 */
    deduplication?: {
        enabled?: boolean;
        ttl?: number;
    };
    
    /** 优先级支持 */
    priority?: {
        enabled?: boolean;
        maxPriority?: number;
    };
}

/**
 * 队列配置
 */
export interface QueueConfig extends BaseRetryConfig, BaseTimeoutConfig {
    /** 队列名称 */
    name: string;
    
    /** 最大并发数 */
    maxConcurrency?: number;
    
    /** 清理间隔 (毫秒) */
    cleanupInterval?: number;
    
    /** 死信队列配置 */
    dlqEnabled?: boolean;
    
    /** 消息最大存活时间 (毫秒) */
    maxMessageAge?: number;
    
    /** 消息保留时间 (毫秒) */
    retentionTime?: number;
    
    /** 消息去重配置 */
    deduplicationEnabled?: boolean;
    
    /** 优先级支持 */
    prioritySupport?: boolean;
    
    /** 批处理支持 */
    batchProcessing?: boolean;
}