/**
 * 队列统计信息
 */
export interface QueueStats {
    /** 队列名称 */
    queueName: string;
    
    /** 总消息数 */
    totalMessages: number;
    
    /** 待处理消息数 */
    pendingMessages: number;
    
    /** 处理中消息数 */
    processingMessages: number;
    
    /** 失败消息数 */
    failedMessages: number;
    
    /** 死信队列消息数 */
    deadLetterMessages: number;
    
    /** 平均处理时间 (毫秒) */
    averageProcessingTime: number;
    
    /** 吞吐量 (消息/秒) */
    throughput: number;
    
    /** 最后更新时间 */
    lastUpdated: Date;
}