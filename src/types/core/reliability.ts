export interface ReliabilityConfig {
    enablePersistence?: boolean;
    syncMode?: boolean;
    checkpointInterval?: number;
    backupEnable?: boolean;
    backupInterval?: number;
}
