import Database from 'better-sqlite3';
import { DatabaseConfig } from '../types/database';
import { Logger } from '../types/logger';
import { EventEmitter } from 'events';

/**
 * 数据库连接管理器 - 生产级实现
 * 提供连接池、事务管理、性能监控等功能
 */
export class DatabaseManager extends EventEmitter {
  private config: DatabaseConfig;
  private logger?: Logger;
  private db: Database.Database;
  private isInitialized = false;
  private statementCache = new Map<string, Database.Statement>();
  private transactionPool: Database.Transaction[] = [];

  constructor(config: DatabaseConfig, logger?: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.db = this.createDatabase();
  }

  /**
   * 创建数据库连接
   */
  private createDatabase(): Database.Database {
    try {
      const db = new Database(this.config.path, {
        readonly: this.config.readonly || false,
        timeout: this.config.timeout || 5000,
        verbose: this.config.verbose ? this.logger?.debug : undefined,
      });

      // 配置数据库性能优化
      this.configureDatabase(db);
      
      this.logger?.info('Database connection established', {
        path: this.config.path,
        readonly: this.config.readonly,
      });

      return db;
    } catch (error) {
      this.logger?.error('Failed to create database connection', { error });
      throw error;
    }
  }

  /**
   * 配置数据库性能优化
   */
  private configureDatabase(db: Database.Database): void {
    // WAL模式提供更好的并发性能
    db.pragma('journal_mode = WAL');
    
    // 同步模式平衡性能和持久性
    db.pragma('synchronous = NORMAL');
    
    // 缓存大小优化
    db.pragma('cache_size = 10000');
    
    // 临时存储在内存中
    db.pragma('temp_store = memory');
    
    // 启用外键约束
    db.pragma('foreign_keys = ON');
    
    // 页面大小优化
    db.pragma('page_size = 4096');
    
    this.logger?.debug('Database performance optimizations applied');
  }

  /**
   * 初始化数据库架构
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.createTables();
      await this.createIndexes();
      await this.createTriggers();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      this.logger?.info('Database schema initialized successfully');
    } catch (error) {
      this.logger?.error('Failed to initialize database schema', { error });
      throw error;
    }
  }

  /**
   * 创建核心表结构
   */
  private async createTables(): Promise<void> {
    const tables = [
      // 队列表
      `CREATE TABLE IF NOT EXISTS queues (
        name TEXT PRIMARY KEY,
        config TEXT NOT NULL, -- JSON配置
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // 消息表 - 分区设计
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        queue_name TEXT NOT NULL,
        payload TEXT NOT NULL, -- JSON消息内容
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        retries INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        available_at INTEGER DEFAULT (strftime('%s', 'now')),
        processed_at INTEGER,
        failed_at INTEGER,
        error_message TEXT,
        processing_time INTEGER,
        metadata TEXT, -- JSON元数据
        deduplication_id TEXT,
        expires_at INTEGER,
        FOREIGN KEY (queue_name) REFERENCES queues(name) ON DELETE CASCADE
      )`,

      // 死信队列表
      `CREATE TABLE IF NOT EXISTS dead_letter_messages (
        id TEXT PRIMARY KEY,
        original_id TEXT NOT NULL,
        queue_name TEXT NOT NULL,
        payload TEXT NOT NULL,
        error_message TEXT NOT NULL,
        retries INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        original_created_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (queue_name) REFERENCES queues(name) ON DELETE CASCADE
      )`,

      // 消息统计表
      `CREATE TABLE IF NOT EXISTS message_stats (
        queue_name TEXT PRIMARY KEY,
        total_messages INTEGER DEFAULT 0,
        pending_messages INTEGER DEFAULT 0,
        processing_messages INTEGER DEFAULT 0,
        completed_messages INTEGER DEFAULT 0,
        failed_messages INTEGER DEFAULT 0,
        dead_letter_messages INTEGER DEFAULT 0,
        avg_processing_time INTEGER DEFAULT 0,
        last_updated INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (queue_name) REFERENCES queues(name) ON DELETE CASCADE
      )`,

      // 消费者状态表
      `CREATE TABLE IF NOT EXISTS consumers (
        id TEXT PRIMARY KEY,
        queue_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        config TEXT NOT NULL, -- JSON配置
        last_activity INTEGER DEFAULT (strftime('%s', 'now')),
        messages_processed INTEGER DEFAULT 0,
        errors_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (queue_name) REFERENCES queues(name) ON DELETE CASCADE
      )`,

      // 事件日志表
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        queue_name TEXT NOT NULL,
        message_id TEXT,
        data TEXT, -- JSON事件数据
        error TEXT,
        timestamp INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (queue_name) REFERENCES queues(name) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      )`
    ];

    for (const sql of tables) {
      this.db.exec(sql);
    }
  }

  /**
   * 创建性能优化索引
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      // 消息状态索引
      'CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)',
      'CREATE INDEX IF NOT EXISTS idx_messages_queue_status ON messages(queue_name, status)',
      'CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority DESC)',
      'CREATE INDEX IF NOT EXISTS idx_messages_available ON messages(available_at) WHERE status = "pending"',
      'CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages(expires_at) WHERE expires_at IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_messages_dedup ON messages(queue_name, deduplication_id)',

      // 时间索引
      'CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_messages_processed ON messages(processed_at)',
      'CREATE INDEX IF NOT EXISTS idx_messages_failed ON messages(failed_at)',

      // 死信队列索引
      'CREATE INDEX IF NOT EXISTS idx_dlq_queue ON dead_letter_messages(queue_name)',
      'CREATE INDEX IF NOT EXISTS idx_dlq_created ON dead_letter_messages(created_at)',

      // 事件索引
      'CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)',
      'CREATE INDEX IF NOT EXISTS idx_events_queue ON events(queue_name)',
      'CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)',

      // 消费者索引
      'CREATE INDEX IF NOT EXISTS idx_consumers_queue ON consumers(queue_name)',
      'CREATE INDEX IF NOT EXISTS idx_consumers_status ON consumers(status)'
    ];

    for (const sql of indexes) {
      this.db.exec(sql);
    }
  }

  /**
   * 创建数据库触发器
   */
  private async createTriggers(): Promise<void> {
    const triggers = [
      // 更新队列更新时间
      `CREATE TRIGGER IF NOT EXISTS update_queues_timestamp 
       AFTER UPDATE ON queues 
       BEGIN 
         UPDATE queues SET updated_at = strftime('%s', 'now') WHERE name = NEW.name;
       END`,

      // 消息状态变更触发器
      `CREATE TRIGGER IF NOT EXISTS update_message_stats
       AFTER UPDATE OF status ON messages
       BEGIN
         UPDATE message_stats SET 
           pending_messages = (SELECT COUNT(*) FROM messages WHERE queue_name = NEW.queue_name AND status = 'pending'),
           processing_messages = (SELECT COUNT(*) FROM messages WHERE queue_name = NEW.queue_name AND status = 'processing'),
           completed_messages = (SELECT COUNT(*) FROM messages WHERE queue_name = NEW.queue_name AND status = 'completed'),
           failed_messages = (SELECT COUNT(*) FROM messages WHERE queue_name = NEW.queue_name AND status = 'failed'),
           last_updated = strftime('%s', 'now')
         WHERE queue_name = NEW.queue_name;
       END`,

      // 消息插入触发器
      `CREATE TRIGGER IF NOT EXISTS insert_message_stats
       AFTER INSERT ON messages
       BEGIN
         INSERT OR IGNORE INTO message_stats (queue_name) VALUES (NEW.queue_name);
         UPDATE message_stats SET 
           total_messages = total_messages + 1,
           pending_messages = pending_messages + 1,
           last_updated = strftime('%s', 'now')
         WHERE queue_name = NEW.queue_name;
       END`
    ];

    for (const sql of triggers) {
      this.db.exec(sql);
    }
  }

  /**
   * 获取数据库连接
   */
  public getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * 准备SQL语句（带缓存）
   */
  public prepare(sql: string): Database.Statement {
    if (this.statementCache.has(sql)) {
      return this.statementCache.get(sql)!;
    }

    const stmt = this.db.prepare(sql);
    this.statementCache.set(sql, stmt);
    return stmt;
  }

  /**
   * 开始事务
   */
  public transaction(): Database.Transaction {
    return this.db.transaction.bind(this.db);
  }

  /**
   * 执行事务
   */
  public async executeTransaction<T>(
    callback: (db: Database.Database) => T
  ): Promise<T> {
    const transaction = this.transaction();
    return transaction(callback)(this.db);
  }

  /**
   * 健康检查
   */
  public healthCheck(): boolean {
    try {
      const result = this.db.prepare('SELECT 1').get();
      return result !== undefined;
    } catch (error) {
      this.logger?.error('Database health check failed', { error });
      return false;
    }
  }

  /**
   * 关闭数据库连接
   */
  public async close(): Promise<void> {
    try {
      // 清理缓存
      this.statementCache.clear();
      
      // 关闭数据库
      this.db.close();
      
      this.logger?.info('Database connection closed');
      this.emit('closed');
    } catch (error) {
      this.logger?.error('Error closing database connection', { error });
      throw error;
    }
  }

  /**
   * 获取数据库统计信息
   */
  public getStats(): any {
    return {
      tables: this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
      indexes: this.db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all(),
      size: this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get(),
      cache: {
        size: this.db.prepare('PRAGMA cache_size').get(),
        hits: this.db.prepare('PRAGMA cache_hit').get(),
        misses: this.db.prepare('PRAGMA cache_miss').get(),
      }
    };
  }
}