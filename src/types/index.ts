/**
 * LocusMQ 类型定义统一导出
 * 采用模块化设计，按需导入
 */

// 核心配置
export { LocusMQConfig } from './core/index';
export { DatabaseConfig, Migration } from './database';

// 队列相关
export { QueueConfig, QueueGlobalConfig } from './queue/config';
export { QueueStats } from './queue/stats';

// 消费者相关
export { ConsumerGlobalConfig, ConnectionPoolConfig as ConsumerConnectionPoolConfig } from './consumer/config';
// export { ConsumeOptions } from './consumer/options';
// export { ConsumerStats } from './consumer/stats';

// 生产者相关
export { ProducerGlobalConfig, ConnectionPoolConfig as ProducerConnectionPoolConfig } from './producer/config';
// export { BatchConfig } from './producer/batch';
// export { BatchSendOptions } from './producer/batch';

// 消息相关
export { Message, SendMessageOptions, DeadLetterMessage } from './message/type';
// export { MessageStatus } from './message/status';
// export { MessageFilter } from './message/filter';

// 事件系统
export { MessageEvent, MessageEventType, EventHandler } from './event/type';

// 日志系统
export { Logger } from './logger';

// 共享类型
export * from './shared';

// 常量 (保持向后兼容)
export { MESSAGE_STATUS, CONSUMER_STATUS } from './shared/constants';