// 日志系统主入口
export { Logger } from './Logger';
export { LoggerBuilder } from './builders/LoggerBuilder';
export { LoggerFactory } from './factories/LoggerFactory';
export { LogContextBuilder } from './LogContextBuilder';

// 处理器
export { BaseHandler } from './handlers/BaseHandler';
export { ConsoleHandler } from './handlers/ConsoleHandler';
export { FileHandler } from './handlers/FileHandler';

// 工具函数
export * from './tools';

// 创建默认日志器
import { LoggerFactory } from './factories/LoggerFactory';

// 创建全局默认日志器
export const logger = LoggerFactory.getInstance().createLogger('locus-mq');

// 快捷创建方法
export const createLogger = (name: string) => LoggerFactory.getInstance().createLogger(name);
export const createBuilder = (name: string) => LoggerFactory.getInstance().createBuilder(name);

// 环境特定创建器
export const createDevLogger = (name: string) => 
  LoggerFactory.getInstance().createDevLogger(name);

export const createProdLogger = (name: string) => 
  LoggerFactory.getInstance().createProdLogger(name);

export const createTestLogger = (name: string) => 
  LoggerFactory.getInstance().createTestLogger(name);