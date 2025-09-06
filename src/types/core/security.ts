/**
 * Security Config
 */

export interface SecurityConfig {
    enableEncryption?: boolean;
    encryptionKey?: string;
    maxMessagesSize?: number;
    rateLimit?: number;
}