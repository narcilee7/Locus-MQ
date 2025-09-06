import { SendMessageOptions } from "../message/type";

/**
 * 批量发送配置
 */
export interface BatchConfig {
    /** 是否启用批量发送 */
    enabled: boolean;
    
    /** 批处理大小 */
    batchSize: number;
    
    /** 批处理超时时间 (毫秒) */
    batchTimeout: number;
    
    /** 最大重试次数 */
    maxRetries: number;
    
    /** 重试延迟 (毫秒) */
    retryDelay: number;
}

/**
 * 批量发送选项
 */
export interface BatchSendOptions extends SendMessageOptions {
    /** 批量ID */
    batchId?: string;
    
    /** 是否作为批量的一部分 */
    isBatch?: boolean;
}