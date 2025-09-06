import { ConsumerStatus } from "./type";

/**
 * 消费者统计信息
 */
export interface ConsumerStats {
    /** 消费者ID */
    consumerId: string;
    
    /** 队列名称 */
    queueName: string;
    
    /** 已处理消息数 */
    messagesProcessed: number;
    
    /** 处理失败消息数 */
    messagesFailed: number;
    
    /** 平均处理时间 (毫秒) */
    averageProcessingTime: number;
    
    /** 当前并发数 */
    currentConcurrency: number;
    
    /** 消费者状态 */
    status: ConsumerStatus;
    
    /** 开始时间 */
    startedAt: Date;
    
    /** 最后活动时间 */
    lastActivityAt: Date;
    
    /** 错误率 */
    errorRate: number;
    
    /** 吞吐量 (消息/秒) */
    throughput: number;
}