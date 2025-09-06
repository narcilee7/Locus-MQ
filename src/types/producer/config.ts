/**
 * 生产者配置定义
 */

import { SendMessageOptions } from "../message/type";
import { BatchConfig } from "../producer/batch";

/**
 * 生产者全局配置
 */
export interface ProducerGlobalConfig {
    /** 默认生产者ID */
    defaultProducerId?: string;
    
    /** 全局默认配置 */
    defaults?: ProducerDefaults;
    
    /** 批量发送配置 */
    batch?: BatchConfig;
    
    /** 连接池配置 */
    pool?: ConnectionPoolConfig;
}

/**
 * 生产者默认配置
 */
export interface ProducerDefaults {
    /** 默认延迟时间 (毫秒) */
    defaultDelay?: number;
    
    /** 默认优先级 */
    defaultPriority?: number;
    
    /** 默认最大重试次数 */
    defaultMaxRetries?: number;
    
    /** 是否启用消息去重 */
    enableDeduplication?: boolean;
    
    /** 消息最大大小 (字节) */
    maxMessageSize?: number;
    
    /** 速率限制 (消息/秒) */
    rateLimit?: number;
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

/**
 * 批量发送选项 (从batch.ts导入)
 */
export { BatchSendOptions } from '../producer/batch';