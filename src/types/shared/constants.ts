export const MESSAGE_STATUS = {
    PENDING: 'pending' as const,
    PROCESSING: 'processing' as const,
    COMPLETED: 'completed' as const,
    FAILED: 'failed' as const,
    SCHEDULED: 'scheduled' as const,
    ARCHIVED: 'archived' as const,
} as const;

export const CONSUMER_STATUS = {
    ACTIVE: 'active' as const,
    INACTIVE: 'inactive' as const,
    STOPPING: 'stopping' as const,
    ERROR: 'error' as const,
    STOPPED: 'stopped' as const,
} as const;