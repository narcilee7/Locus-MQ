import { SendMessageOptions } from "../message/type";

/**
 * 批量发送配置
 */
export interface BatchConfig {
    /** 是否启用批量发送 */
    enabled?: boolean;
    
    /** 批处理大小上限 */
    maxBatchSize?: number;
    
    /** 批量等待时间 (毫秒) */
    maxWaitTime?: number;
    
    /** 最大重试次数 */
    maxRetries?: number;
    
    /** 重试延迟 (毫秒) */
    retryDelay?: number;
    
    /** 失败时的回退策略 */
    backoffStrategy?: 'exponential' | 'linear' | 'fixed';
    
    /** 是否启用压缩 */
    compressionEnabled?: boolean;
    
    /** 压缩阈值 (字节) */
    compressionThreshold?: number;
    
    /** 是否并行处理 */
    parallelProcessing?: boolean;
    
    /** 并行度 */
    parallelism?: number;
}

/**
 * 批量发送选项
 */
export interface BatchSendOptions extends SendMessageOptions {
    /** 批量ID */
    batchId?: string;
    
    /** 是否作为批量的一部分 */
    isBatch?: boolean;
    
    /** 批量大小 */
    batchSize?: number;
    
    /** 等待时间 (毫秒) */
    waitTime?: number;
    
    /** 是否并行处理 */
    parallel?: boolean;
    
    /** 并行度 */
    parallelism?: number;
    
    /** 失败处理策略 */
    onError?: 'retry' | 'skip' | 'stop';
}

/**
 * 批量消息项
 */
export interface BatchMessage<T = any> {
    /** 消息内容 */
    payload: T;
    
    /** 消息选项 */
    options?: SendMessageOptions;
}

/**
 * 批量发送结果
 */
export interface BatchSendResult {
    /** 成功发送的消息ID */
    successful: string[];
    
    /** 失败的消息及原因 */
    failed: Array<{
        message: any;
        error: Error;
    }>;
    
    /** 批量ID */
    batchId: string;
    
    /** 发送时间戳 */
    timestamp: Date;
    
    /** 耗时 (毫秒) */
    duration: number;
}

/**
 * 批量发送状态
 */
export type BatchStatus = 'pending' | 'sending' | 'completed' | 'failed' | 'partial';

/**
 * 批量发送任务
 */
export interface BatchTask<T = any> {
    /** 任务ID */
    id: string;
    
    /** 队列名称 */
    queueName: string;
    
    /** 消息列表 */
    messages: BatchMessage<T>[];
    
    /** 发送选项 */
    options: BatchSendOptions;
    
    /** 状态 */
    status: BatchStatus;
    
    /** 创建时间 */
    createdAt: Date;
    
    /** 开始时间 */
    startedAt?: Date;
    
    /** 完成时间 */
    completedAt?: Date;
    
    /** 结果 */
    result?: BatchSendResult;
    
    /** 错误信息 */
    error?: Error;
}