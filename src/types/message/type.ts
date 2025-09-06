import { MessageStatus } from "./status";

/**
 * Message Payload
 */
export interface SendMessageOptions {
    delay?: number;
    priority?: number;
    maxRetries?: number;
    metadata?: Record<string, any>;
    deduplicationId?: string;
    expiresAt?: Date;
}

export interface Message<T = any> {
    id: string;
    queueName: string;
    payload: T;
    retries: number;
    maxRetries: number;
    priority: number;
    metadata?: Record<string, any>;
    createdAt: Date;
    availableAt: Date;
    processedAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
    processingTime?: number;
}

/**
 * DeadLetterMessage
 */
export interface DeadLetterMessage<T = any> extends Message<T> {
    originalId: string;
    errorMessage: string;
    retries: number;
    createdAt: Date;
    originalCreatedAt: Date;
}

