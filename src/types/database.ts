import type { Database } from "better-sqlite3";
import { ConnectionPoolConfig } from "./shared/base";

export interface DatabaseConfig {
    path: string;
    readonly?: boolean;
    timeout?: number;
    verbose?: boolean;
    migrations?: string[];
    pool?: ConnectionPoolConfig;
}

export interface Migration {
    version: string;
    description: string;
    // 支持同步和异步
    up: (db: Database) => void | Promise<void>;
    down: (db: Database) => void | Promise<void>;
}