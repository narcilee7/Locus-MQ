import { Message } from "../message/type";

/**
 * 消息事件类型
 */
export type MessageEventType = 
    | 'message_received'      // 消息接收
    | 'message_processed'     // 消息处理完成
    | 'message_failed'        // 消息处理失败
    | 'message_expired'       // 消息过期
    | 'message_retried'       // 消息重试
    | 'message_dead_letter'   // 消息进入死信队列
    | 'queue_full'            // 队列满
    | 'consumer_error'        // 消费者错误
    | 'producer_error';       // 生产者错误

/**
 * 消息事件接口
 */
export interface MessageEvent<T = any> {
    /** 事件类型 */
    type: MessageEventType;
    
    /** 关联的消息 */
    message: Message<T>;
    
    /** 队列名称 */
    queueName: string;
    
    /** 事件时间戳 */
    timestamp: Date;
    
    /** 额外元数据 */
    metadata?: Record<string, any>;
    
    /** 错误信息 (仅在失败事件中) */
    error?: Error;
}

/**
 * 事件处理器类型
 */
export type EventHandler<T = any> = (event: MessageEvent<T>) => void | Promise<void>;

/**
 * 事件系统配置
 */
export interface EventSystemConfig {
    /** 是否启用事件系统 */
    enabled?: boolean;
    
    /** 事件缓冲区大小 */
    bufferSize?: number;
    
    /** 事件处理超时时间 (毫秒) */
    handlerTimeout?: number;
    
    /** 是否异步处理事件 */
    async?: boolean;
}