
/**
 * 消息状态枚举
 */
export const MESSAGE_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SCHEDULED: 'scheduled',
    ARCHIVED: 'archived'
} as const;

/**
 * 消息状态类型
 */
export type MessageStatus = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];