import { DatabaseConfig } from "../database";
import { DebugConfig } from "./debug";
import { MonitoringConfig } from "./monitor";
import { PerformanceConfig } from "./performance";
import { ReliabilityConfig } from "./reliability";
import { SecurityConfig } from "./security";
import { QueueGlobalConfig } from "../queue/config";
import { ConsumerGlobalConfig } from "../consumer/config";
import { ProducerGlobalConfig } from "../producer/config";
import { LoggerConfig, Logger } from "../logger";

/**
 * LocusMQ 主配置接口
 */
export interface LocusMQConfig {
    /** 数据库配置 - 必需 */
    database: DatabaseConfig;

    /** 日志配置 */
    logger?: LoggerConfig;

    /** 队列全局配置 */
    queue?: QueueGlobalConfig;
    
    /** 消费者全局配置 */
    consumer?: ConsumerGlobalConfig;
    
    /** 生产者全局配置 */
    producer?: ProducerGlobalConfig;

    /** 安全配置 */
    security?: SecurityConfig;
    
    /** 性能配置 */
    performance?: PerformanceConfig;
    
    /** 监控配置 */
    monitoring?: MonitoringConfig;
    
    /** 可靠性配置 */
    reliability?: ReliabilityConfig;

    /** 调试配置 */
    debug?: DebugConfig;
}