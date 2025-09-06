import { LogContext } from "./context";
import { Logger } from "./instance";
import { LogEntry } from "./middleware";

/**
 * 性能计时器接口
 */
export interface PerformanceTimer {
    /** 计时器名称 */
    name: string;
    /** 开始时间 */
    startTime: number;
    /** 结束时间 */
    endTime?: number;
    /** 持续时间 (毫秒) */
    duration?: number;
    /** 标签 */
    labels?: Record<string, string>;
    /** 开始计时 */
    start(): void;
    /** 结束计时并返回持续时间 */
    end(): number;
    /** 获取持续时间 */
    getDuration(): number;
    /** 获取上下文 */
    getContext(): LogContext | undefined;
}

/**
 * 函数调用追踪信息
 */
export interface FunctionTrace {
    /** 函数名称 */
    functionName: string;
    /** 调用参数 */
    args: any[];
    /** 返回值 */
    result?: any;
    /** 执行时间 (毫秒) */
    duration: number;
    /** 错误信息 */
    error?: Error;
    /** 调用栈 */
    stack?: string;
    /** 内存使用变化 (字节) */
    memoryDelta?: number;
}

/**
 * 消息生命周期事件
 */
export interface MessageLifecycleEvent {
    /** 事件类型 */
    type: 'created' | 'queued' | 'processing' | 'processed' | 'failed' | 'retry' | 'timeout' | 'cancelled';
    /** 消息ID */
    messageId: string;
    /** 队列名称 */
    queueName: string;
    /** 时间戳 */
    timestamp: number;
    /** 额外数据 */
    data?: Record<string, any>;
}

/**
 * 队列监控指标
 */
export interface QueueMetrics {
    /** 队列名称 */
    queueName: string;
    /** 队列大小 */
    size: number;
    /** 处理中消息数量 */
    processing: number;
    /** 成功处理数量 */
    succeeded: number;
    /** 失败数量 */
    failed: number;
    /** 重试数量 */
    retried: number;
    /** 平均处理时间 (毫秒) */
    avgProcessingTime: number;
    /** 最大处理时间 (毫秒) */
    maxProcessingTime: number;
    /** 最小处理时间 (毫秒) */
    minProcessingTime: number;
    /** 吞吐率 (消息/秒) */
    throughput: number;
}

/**
 * 消费者监控指标
 */
export interface ConsumerMetrics {
    /** 消费者ID */
    consumerId: string;
    /** 队列名称 */
    queueName: string;
    /** 活跃状态 */
    isActive: boolean;
    /** 处理的消息数量 */
    messagesProcessed: number;
    /** 错误数量 */
    errors: number;
    /** 最后活动时间 */
    lastActivity: number;
    /** 平均处理速率 (消息/秒) */
    processingRate: number;
    /** 连接状态 */
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
    /** 重连次数 */
    reconnectCount: number;
}

/**
 * 性能分析器接口
 */
export interface PerformanceProfiler {
    /** 开始性能分析 */
    startProfiling(name: string): void;
    
    /** 结束性能分析并记录结果 */
    stopProfiling(name: string): void;
    
    /** 记录内存快照 */
    takeMemorySnapshot(name: string): void;
    
    /** 获取性能报告 */
    getReport(): PerformanceReport;
    
    /** 记录函数性能 */
    profile<T>(name: string, fn: () => T): T;
    
    /** 记录异步函数性能 */
    profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * 性能报告
 */
export interface PerformanceReport {
    /** 报告生成时间 */
    timestamp: number;
    /** 计时器数据 */
    timers: PerformanceTimer[];
    /** 函数追踪数据 */
    traces: FunctionTrace[];
    /** 队列指标 */
    queueMetrics: QueueMetrics[];
    /** 消费者指标 */
    consumerMetrics: ConsumerMetrics[];
    /** 内存使用数据 */
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        arrayBuffers: number;
    };
    /** 系统信息 */
    system: {
        uptime: number;
        loadAverage: number[];
        freeMemory: number;
        totalMemory: number;
    };
    /** 网络统计 */
    network?: {
        requests: number;
        responses: number;
        errors: number;
        avgResponseTime: number;
    };
}

/**
 * 调试工具接口
 */
export interface DebugTools {
    /** 调试日志器 */
    logger: Logger;
    
    /** 性能分析器 */
    profiler: PerformanceProfiler;
    
    /** 创建性能计时器 */
    createTimer(name: string, context?: LogContext): PerformanceTimer;
    
    /** 记录函数调用 */
    traceFunction<T extends (...args: any[]) => any>(
        fn: T,
        name?: string,
        context?: LogContext
    ): T;
    
    /** 记录消息生命周期 */
    traceMessageLifecycle(
        messageId: string,
        queueName: string
    ): {
        onCreated: () => void;
        onQueued: () => void;
        onReceived: () => void;
        onProcessing: () => void;
        onCompleted: () => void;
        onFailed: (error: Error) => void;
        onRetry: (attempt: number) => void;
        onTimeout: () => void;
        onCancelled: () => void;
    };
    
    /** 记录队列操作 */
    traceQueueOperation(
        operation: string,
        queueName: string,
        details?: Record<string, any>
    ): <T>(result: T) => T;
    
    /** 内存监控 */
    monitorMemory(): {
        start(): void;
        stop(): void;
        getSnapshot(): LogContext;
    };
    
    /** 收集队列指标 */
    collectQueueMetrics(queueName: string): Promise<QueueMetrics>;
    
    /** 收集消费者指标 */
    collectConsumerMetrics(consumerId: string): Promise<ConsumerMetrics>;
    
    /** 创建调试上下文 */
    createDebugContext(
        operation: string,
        context?: Partial<LogContext>
    ): LogContext;
    
    /** 开始调试会话 */
    startDebugSession(sessionId: string): void;
    
    /** 结束调试会话 */
    endDebugSession(sessionId: string): PerformanceReport;
    
    /** 记录网络请求 */
    traceNetworkRequest(
        url: string,
        method: string,
        duration: number,
        status: number
    ): void;
}

/**
 * 日志分析器接口
 */
export interface LogAnalyzer {
    /** 分析日志模式 */
    analyzePatterns(logs: LogEntry[]): LogPatternAnalysis;
    
    /** 检测异常 */
    detectAnomalies(logs: LogEntry[]): LogAnomaly[];
    
    /** 生成性能报告 */
    generatePerformanceReport(logs: LogEntry[]): PerformanceReport;
    
    /** 搜索日志 */
    searchLogs(
        criteria: LogSearchCriteria,
        logs: LogEntry[]
    ): LogEntry[];
    
    /** 聚合统计 */
    aggregateStats(logs: LogEntry[]): LogStats;
}

/**
 * 日志模式分析结果
 */
export interface LogPatternAnalysis {
    /** 最常见的日志级别 */
    commonLevels: { level: string; count: number }[];
    /** 最常见的错误 */
    commonErrors: { message: string; count: number }[];
    /** 时间分布 */
    timeDistribution: { hour: number; count: number }[];
    /** 模块使用频率 */
    moduleUsage: { module: string; count: number }[];
    /** 错误趋势 */
    errorTrends: { date: string; count: number }[];
    /** 性能趋势 */
    performanceTrends: { date: string; avgTime: number }[];
}

/**
 * 日志异常
 */
export interface LogAnomaly {
    /** 异常类型 */
    type: 'error_spike' | 'performance_degradation' | 'memory_leak' | 'timeout_pattern' | 'rate_limit_exceeded';
    /** 严重程度 */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** 描述 */
    description: string;
    /** 时间戳 */
    timestamp: number;
    /** 相关日志 */
    relatedLogs: LogEntry[];
    /** 建议的解决方案 */
    suggestions: string[];
}

/**
 * 日志搜索条件
 */
export interface LogSearchCriteria {
    /** 日志级别 */
    level?: string;
    /** 时间范围 */
    timeRange?: {
        start: Date;
        end: Date;
    };
    /** 模块名称 */
    module?: string;
    /** 消息包含文本 */
    message?: string;
    /** 上下文过滤 */
    context?: Partial<LogContext>;
    /** 标签过滤 */
    tags?: string[];
    /** 错误类型 */
    errorType?: string;
}

/**
 * 日志统计信息
 */
export interface LogStats {
    /** 总日志数量 */
    total: number;
    /** 级别分布 */
    levelDistribution: Record<string, number>;
    /** 模块分布 */
    moduleDistribution: Record<string, number>;
    /** 错误统计 */
    errorStats: {
        total: number;
        unique: number;
        byType: Record<string, number>;
    };
    /** 性能统计 */
    performanceStats: {
        avgProcessingTime: number;
        maxProcessingTime: number;
        minProcessingTime: number;
    };
    /** 时间范围 */
    timeRange: {
        start: Date;
        end: Date;
    };
}

/**
 * 日志工具工厂
 */
export interface LoggerToolsFactory {
    /** 创建调试工具 */
    createDebugTools(logger: Logger): DebugTools;
    
    /** 创建性能分析器 */
    createProfiler(logger: Logger): PerformanceProfiler;
    
    /** 创建日志分析器 */
    createAnalyzer(logger: Logger): LogAnalyzer;
    
    /** 创建上下文增强器 */
    createContextEnhancer(logger: Logger): {
        withContext<T>(context: LogContext, fn: () => T): T;
        withAsyncContext<T>(context: LogContext, fn: () => Promise<T>): Promise<T>;
    };
    
    /** 创建上下文构建器 */
    createContextBuilder(): LogContextBuilder;
    
    /** 创建日志上下文构建器 */
    createLogContextBuilder(): LogContextBuilder;
}

/**
 * 日志上下文构建器
 */
export interface LogContextBuilder {
    /** 设置模块 */
    module(name: string): this;
    
    /** 设置操作 */
    operation(name: string): this;
    
    /** 设置队列 */
    queue(queueName: string): this;
    
    /** 设置消息 */
    message(messageId: string): this;
    
    /** 设置消费者 */
    consumer(consumerId: string): this;
    
    /** 设置生产者 */
    producer(producerId: string): this;
    
    /** 添加性能指标 */
    metrics(metrics: LogContext['metrics']): this;
    
    /** 添加元数据 */
    metadata(metadata: Record<string, any>): this;
    
    /** 添加标签 */
    tag(tag: string): this;
    
    /** 添加多个标签 */
    tags(tags: string[]): this;
    
    /** 设置请求ID */
    requestId(requestId: string): this;
    
    /** 设置用户ID */
    userId(userId: string): this;
    
    /** 设置会话ID */
    sessionId(sessionId: string): this;
    
    /** 添加自定义字段 */
    setField(key: string, value: any): this;
    
    /** 构建上下文 */
    build(): LogContext;
}