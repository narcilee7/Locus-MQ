export interface LogContext {
    /** 模块名称 */
    module?: string;
    /** 操作 */
    operation?: string;
    requestId?: string;
    queueName?: string;
    consumerId?: string;
    producerId?: string;
    messageId?: string;
    tags?: string[];
    [key: string]: any;
}

export interface LogMetadata extends LogContext {
    duration?: number;
    memoryUsage?: number;
    stack?: string;
    detail?: Record<string, any>;
}

