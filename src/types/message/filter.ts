import { MessageStatus } from "./status";

/**
 * 消息过滤器接口
 */
export interface MessageFilter {
    /** 队列名称 */
    queueName?: string;
    
    /** 消息状态列表 */
    status?: MessageStatus[];
    
    /** 最小优先级 */
    minPriority?: number;
    
    /** 最大优先级 */
    maxPriority?: number;
    
    /** 创建时间范围 - 开始 */
    fromCreatedAt?: Date;
    
    /** 创建时间范围 - 结束 */
    toCreatedAt?: Date;
    
    /** 可用时间范围 - 开始 */
    fromAvailableAt?: Date;
    
    /** 可用时间范围 - 结束 */
    toAvailableAt?: Date;
    
    /** 重试次数范围 - 最小 */
    minRetries?: number;
    
    /** 重试次数范围 - 最大 */
    maxRetries?: number;
    
    /** 消息ID列表 */
    messageIds?: string[];
    
    /** 去重ID */
    deduplicationId?: string;
    
    /** 元数据过滤 */
    metadata?: Record<string, any>;
    
    /** 分页 - 限制数量 */
    limit?: number;
    
    /** 分页 - 偏移量 */
    offset?: number;
    
    /** 排序字段 */
    orderBy?: 'createdAt' | 'availableAt' | 'priority' | 'retries';
    
    /** 排序方向 */
    orderDirection?: 'asc' | 'desc';
}