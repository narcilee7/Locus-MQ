/**
 * Error Definition
 */

export interface LocusMQError {
    code: string;
    message: string;
    queueName?: string;
    messageId?: string;
    timestamp: Date;
    stack?: string;
}

export type ErrorHandler = (error: LocusMQError) => void;
