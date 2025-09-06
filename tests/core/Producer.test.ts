import { describe, it, expect, beforeEach } from 'vitest';
import { Producer } from '../../src/core/Producer';
import { SchemaManager } from '../../src/core/SchemaManager';
import { TEST_DB_PATH, createTestConfig } from '../setup';

describe('Producer', () => {
  let producer: Producer;
  let schemaManager: SchemaManager;

  beforeEach(() => {
    schemaManager = new SchemaManager(TEST_DB_PATH);
    producer = new Producer(schemaManager);
  });

  describe('send message', () => {
    it('should send message successfully', async () => {
      const messageId = await producer.send('test-queue', { data: 'test' });
      
      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
    });

    it('should send message with delay', async () => {
      const messageId = await producer.send('test-queue', { data: 'delayed' }, {
        delay: 5000
      });
      
      expect(messageId).toBeDefined();
    });

    it('should send message with priority', async () => {
      const messageId = await producer.send('test-queue', { data: 'priority' }, {
        priority: 9
      });
      
      expect(messageId).toBeDefined();
    });

    it('should handle deduplication', async () => {
      const dedupId = 'unique-id-123';
      
      const messageId1 = await producer.send('test-queue', { data: 'test' }, {
        deduplicationId: dedupId
      });
      
      const messageId2 = await producer.send('test-queue', { data: 'test' }, {
        deduplicationId: dedupId
      });
      
      expect(messageId1).toBe(messageId2);
    });

    it('should send batch messages', async () => {
      const messages = [
        { payload: { data: 'test1' } },
        { payload: { data: 'test2' } },
        { payload: { data: 'test3' } }
      ];
      
      const messageIds = await producer.sendBatch('test-queue', messages);
      
      expect(messageIds).toHaveLength(3);
      messageIds.forEach(id => {
        expect(typeof id).toBe('string');
      });
    });

    it('should handle invalid queue name', async () => {
      await expect(producer.send('', { data: 'test' }))
        .rejects.toThrow('Queue name cannot be empty');
    });

    it('should handle invalid payload', async () => {
      await expect(producer.send('test-queue', null))
        .rejects.toThrow('Payload cannot be null or undefined');
    });
  });
});