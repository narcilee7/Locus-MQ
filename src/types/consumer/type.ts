/**
 * 消费者配置选项
 */
export interface ConsumeOptions {
    /** 批处理大小 */
    batchSize?: number;
    
    /** 轮询间隔 (毫秒) */
    pollInterval?: number;
    
    /** 最大并发数 */
    concurrency?: number;
    
    /** 消息处理超时时间 (毫秒) */
    processingTimeout?: number;
    
    /** 消息可见性超时时间 (毫秒) */
    visibilityTimeout?: number;
    
    /** 是否自动确认消息 */
    autoAck?: boolean;
    
    /** 死信队列配置 */
    deadLetterQueue?: {
        enabled?: boolean;
        maxRetries?: number;
    };
}

/**
 * 消费者状态
 */
export const CONSUMER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PAUSED: 'paused',
    ERROR: 'error'
} as const;

/**
 * 消费者状态类型
 */
export type ConsumerStatus = typeof CONSUMER_STATUS[keyof typeof CONSUMER_STATUS];


