/**
 * 日志系统使用示例
 * 
 * 这个文件展示了如何使用我们新构建的日志系统
 */

import { 
  LoggerFactory, 
  LoggerBuilder, 
  LogContextBuilder,
  PerformanceTimer,
  FunctionTracer,
  LogUtils,
  LogMiddleware,
  createLogger,
  createDevLogger,
  createProdLogger,
  logger
} from '../index';

// 示例1: 使用工厂模式创建日志器
function exampleFactoryUsage() {
  console.log('=== 工厂模式示例 ===');
  
  // 创建基础日志器
  const basicLogger = LoggerFactory.getInstance().createLogger('basic-app');
  basicLogger.info('这是基础日志器的消息');

  // 创建开发环境日志器
  const devLogger = createDevLogger('dev-app');
  devLogger.debug('这是调试消息');
  devLogger.info('这是信息消息');

  // 创建生产环境日志器
  const prodLogger = createProdLogger('prod-app');
  prodLogger.info('这是生产环境消息');

  // 创建测试环境日志器
  const testLogger = createTestLogger('test-app');
  testLogger.trace('这是跟踪消息');
}

// 示例2: 使用构建者模式自定义日志器
function exampleBuilderUsage() {
  console.log('=== 构建者模式示例 ===');
  
  const customLogger = new LoggerBuilder('custom-app')
    .setLevel('DEBUG')
    .enableConsole({
      colors: true,
      showLevel: true,
      showNamespace: true,
    })
    .enableFile({
      path: './logs/custom.log',
      maxSize: 1024 * 1024, // 1MB
      maxFiles: 3,
      rotation: 'daily',
      compress: true,
    })
    .setAsync(true)
    .setBufferSize(100)
    .setContext({
      service: 'my-service',
      version: '1.0.0',
    })
    .addContext('environment', 'development')
    .build();

  customLogger.info('这是自定义配置的日志消息');
  customLogger.warn('这是警告消息');
  customLogger.error('这是错误消息', new Error('测试错误'));

  return customLogger;
}

// 示例3: 使用上下文构建器
function exampleContextBuilderUsage() {
  console.log('=== 上下文构建器示例 ===');
  
  const logger = createLogger('context-app');
  
  // 创建基础上下文
  const context = new LogContextBuilder()
    .setModule('user-service')
    .setOperation('create-user')
    .setUserId('user-123')
    .setRequestId(LogUtils.createRequestId())
    .setCorrelationId(LogUtils.createCorrelationId())
    .addMetadata('user-agent', 'Mozilla/5.0')
    .addMetadata('ip-address', '192.168.1.1')
    .build();

  logger.info('用户创建操作开始', context);
  
  // 复用上下文
  const updatedContext = new LogContextBuilder()
    .fromContext(context)
    .setOperation('validate-user')
    .build();
    
  logger.debug('验证用户数据', updatedContext);
}

// 示例4: 性能监控
function examplePerformanceUsage() {
  console.log('=== 性能监控示例 ===');
  
  const logger = createLogger('performance-app');
  
  // 使用性能计时器
  const timer = new PerformanceTimer();
  
  // 模拟一些操作
  setTimeout(() => {
    logger.info('操作完成', {
      duration: timer.getDurationMs(),
      operation: 'database-query',
    });
  }, 100);
}

// 示例5: 函数追踪
function exampleFunctionTracing() {
  console.log('=== 函数追踪示例 ===');
  
  const logger = createLogger('tracing-app');
  
  // 普通函数
  function syncFunction(x: number, y: number): number {
    return x + y;
  }
  
  // 异步函数
  async function asyncFunction(delay: number): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => resolve('完成'), delay);
    });
  }
  
  // 包装函数
  const tracedSync = FunctionTracer.trace(logger, syncFunction, {
    operation: 'addition',
  });
  
  const tracedAsync = FunctionTracer.trace(logger, asyncFunction, {
    operation: 'delayed-operation',
  });
  
  // 调用包装后的函数
  tracedSync(5, 3);
  tracedAsync(50);
}

// 示例6: 装饰器使用
function exampleDecoratorUsage() {
  console.log('=== 装饰器示例 ===');
  
  class UserService {
    private logger = createLogger('user-service');

    @LogMethod('info', { module: 'user-service' })
    createUser(name: string, email: string) {
      // 模拟用户创建
      return { id: 'user-123', name, email };
    }

    @LogMethod('debug', { module: 'user-service' })
    async validateUser(userId: string) {
      // 模拟异步验证
      await new Promise(resolve => setTimeout(resolve, 100));
      return { valid: true, userId };
    }
  }

  const service = new UserService();
  service.createUser('张三', 'zhangsan@example.com');
  service.validateUser('user-123');
}

// 示例7: 中间件使用
function exampleMiddlewareUsage() {
  console.log('=== 中间件示例 ===');
  
  const logger = createLogger('middleware-app');
  
  // 创建队列日志中间件
  const queueLogger = LogMiddleware.createQueueLogger(logger);
  
  // 模拟队列操作
  const logOperation = queueLogger('email-queue', 'send-email', {
    recipient: 'user@example.com',
    subject: '欢迎邮件',
  });
  
  setTimeout(() => {
    logOperation.complete({ messageId: 'msg-456' });
  }, 200);
  
  // 模拟错误操作
  const errorOperation = queueLogger('sms-queue', 'send-sms', {
    phone: '+1234567890',
  });
  
  setTimeout(() => {
    errorOperation.error(new Error('短信服务不可用'));
  }, 300);
}

// 示例8: 子日志器
function exampleChildLogger() {
  console.log('=== 子日志器示例 ===');
  
  const parentLogger = createLogger('main-app');
  
  // 创建子日志器
  const dbLogger = parentLogger.createChild('database');
  const apiLogger = parentLogger.createChild('api');
  
  parentLogger.info('应用启动');
  dbLogger.info('数据库连接成功');
  apiLogger.info('API服务器启动');
}

// 示例9: 日志工具函数
function exampleLogUtils() {
  console.log('=== 日志工具函数示例 ===');
  
  const logger = createLogger('utils-app');
  
  // 创建请求ID
  const requestId = LogUtils.createRequestId();
  const correlationId = LogUtils.createCorrelationId();
  
  logger.info('请求处理开始', {
    requestId,
    correlationId,
  });
  
  // 敏感数据脱敏
  const sensitiveData = {
    username: 'user123',
    password: 'secret123',
    apiKey: 'sk-1234567890',
    token: 'jwt-token-here',
  };
  
  logger.info('用户数据', {
    data: LogUtils.sanitizeForLog(sensitiveData),
    requestId,
  });
  
  // 格式化时间
  const startTime = Date.now();
  setTimeout(() => {
    logger.info('操作完成', {
      duration: LogUtils.formatDuration(startTime),
      requestId,
    });
  }, 1500);
}

// 示例10: 完整使用场景
async function exampleCompleteUsage() {
  console.log('=== 完整使用场景示例 ===');
  
  // 创建应用日志器
  const appLogger = new LoggerBuilder('my-app')
    .forProduction()
    .setContext({
      service: 'message-queue-service',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
    })
    .build();

  try {
    appLogger.info('应用启动', {
      system: DebugTools.getSystemInfo(),
    });

    // 模拟消息队列操作
    const queueLogger = LogMiddleware.createQueueLogger(appLogger);
    
    const operation = queueLogger('main-queue', 'process-messages', {
      queueSize: 100,
      batchSize: 10,
    });

    // 模拟处理
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    operation.complete({
      processed: 100,
      failed: 0,
      duration: '1.2s',
    });

    appLogger.info('应用关闭');
    
    // 确保所有日志都写入
    await appLogger.close();
    
  } catch (error) {
    appLogger.error('应用错误', error as Error);
  }
}

// 运行所有示例
async function runAllExamples() {
  console.log('🚀 开始日志系统使用示例\n');
  
  exampleFactoryUsage();
  
  const customLogger = exampleBuilderUsage();
  
  exampleContextBuilderUsage();
  examplePerformanceUsage();
  exampleFunctionTracing();
  exampleDecoratorUsage();
  exampleMiddlewareUsage();
  exampleChildLogger();
  exampleLogUtils();
  
  await exampleCompleteUsage();
  
  // 关闭自定义日志器
  if (customLogger) {
    await customLogger.close();
  }
  
  console.log('\n✅ 所有示例完成！');
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// 导出示例函数供其他模块使用
export {
  exampleFactoryUsage,
  exampleBuilderUsage,
  exampleContextBuilderUsage,
  examplePerformanceUsage,
  exampleFunctionTracing,
  exampleDecoratorUsage,
  exampleMiddlewareUsage,
  exampleChildLogger,
  exampleLogUtils,
  exampleCompleteUsage,
  runAllExamples,
};