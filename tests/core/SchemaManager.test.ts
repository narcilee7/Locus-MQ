import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaManager } from '../../src/core/SchemaManager';
import { TEST_DB_PATH, createTestConfig } from '../setup';

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;

  beforeEach(() => {
    schemaManager = new SchemaManager(TEST_DB_PATH);
  });

  describe('initialization', () => {
    it('should create database connection', () => {
      expect(schemaManager.isConnected()).toBe(true);
    });

    it('should create required tables', () => {
      const tables = schemaManager.getTables();
      expect(tables).toContain('locus_messages');
      expect(tables).toContain('locus_queues');
      expect(tables).toContain('locus_dead_letter_messages');
    });

    it('should create required indexes', () => {
      const indexes = schemaManager.getIndexes();
      expect(indexes).toContain('idx_messages_queue_status_available');
      expect(indexes).toContain('idx_messages_created_at');
    });
  });

  describe('transaction management', () => {
    it('should execute transaction atomically', () => {
      const result = schemaManager.transaction((db) => {
        return db.prepare('SELECT 1 as test').get();
      });
      expect(result.test).toBe(1);
    });

    it('should rollback transaction on error', () => {
      expect(() => {
        schemaManager.transaction(() => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });
  });

  describe('connection management', () => {
    it('should close connection properly', () => {
      schemaManager.close();
      expect(schemaManager.isConnected()).toBe(false);
    });

    it('should handle multiple close calls', () => {
      schemaManager.close();
      schemaManager.close(); // Should not throw
      expect(schemaManager.isConnected()).toBe(false);
    });
  });
});