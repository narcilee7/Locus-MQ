import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Consumer } from '../../src/core/Consumer';
import { SchemaManager } from '../../src/core/SchemaManager';
import { Producer } from '../../src/core/Producer';
import { TEST_DB_PATH, createTestConfig, waitFor } from '../setup';

describe('Consumer', () => {
  let consumer: Consumer;
  let producer: Producer;
  let schemaManager: SchemaManager;

  beforeEach(() => {
    schemaManager = new SchemaManager(TEST_DB_PATH);
    producer = new Producer(schemaManager);
    consumer = new Consumer(schemaManager);
  });

  afterEach(async () => {
    await consumer.stopAll();
  });

  describe('consume message', () => {
    it('should consume message successfully', async () => {
      const message = { data: 'test' };
      const handler = vi.fn().mockResolvedValue(undefined);
      
      await producer.send('test-queue', message);
      
      const stop = await consumer.consume('test-queue', handler);
      
      await waitFor(100);
      await stop();
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          queueName: 'test-queue',
          payload: message
        })
      );
    });

    it('should handle message processing failure', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Processing failed'));
      
      await producer.send('test-queue', { data: 'test' });
      
      const stop = await consumer.consume('test-queue', handler);
      
      await waitFor(100);
      await stop();
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle message timeout', async () => {
      const handler = vi.fn().mockImplementation(() => waitFor(1000));
      
      await producer.send('test-queue', { data: 'test' });
      
      const stop = await consumer.consume('test-queue', handler, {
        processingTimeout: 100
      });
      
      await waitFor(200);
      await stop();
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle batch consumption', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      
      await producer.send('test-queue', { data: 'test1' });
      await producer.send('test-queue', { data: 'test2' });
      await producer.send('test-queue', { data: 'test3' });
      
      const stop = await consumer.consume('test-queue', handler, {
        batchSize: 2,
        pollInterval: 50
      });
      
      await waitFor(200);
      await stop();
      
      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should handle priority messages', async () => {
      const messages: string[] = [];
      const handler = vi.fn().mockImplementation((msg) => {
        messages.push(msg.payload.data);
        return Promise.resolve();
      });
      
      await producer.send('test-queue', { data: 'low' }, { priority: 1 });
      await producer.send('test-queue', { data: 'high' }, { priority: 9 });
      await producer.send('test-queue', { data: 'medium' }, { priority: 5 });
      
      const stop = await consumer.consume('test-queue', handler);
      
      await waitFor(100);
      await stop();
      
      expect(messages).toEqual(['high', 'medium', 'low']);
    });

    it('should handle delayed messages', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      
      await producer.send('test-queue', { data: 'delayed' }, { delay: 200 });
      
      const stop = await consumer.consume('test-queue', handler, {
        pollInterval: 50
      });
      
      await waitFor(100);
      expect(handler).not.toHaveBeenCalled();
      
      await waitFor(150);
      await stop();
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent consumers', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);
      
      await producer.send('test-queue', { data: 'test1' });
      await producer.send('test-queue', { data: 'test2' });
      
      const stop1 = await consumer.consume('test-queue', handler1);
      const stop2 = await consumer.consume('test-queue', handler2);
      
      await waitFor(200);
      
      await stop1();
      await stop2();
      
      const totalCalls = handler1.mock.calls.length + handler2.mock.calls.length;
      expect(totalCalls).toBe(2);
    });
  });

  describe('dead letter queue', () => {
    it('should move to DLQ after max retries', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await producer.send('test-queue', { data: 'test' }, { maxRetries: 2 });
      
      const stop = await consumer.consume('test-queue', handler, {
        pollInterval: 50
      });
      
      await waitFor(500);
      await stop();
      
      expect(handler).toHaveBeenCalledTimes(2);
      
      const dlqMessages = await consumer.getDeadLetterMessages('test-queue');
      expect(dlqMessages).toHaveLength(1);
      expect(dlqMessages[0].payload.data).toBe('test');
    });

    it('should requeue from DLQ', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      
      await producer.send('test-queue', { data: 'test' });
      
      // Force move to DLQ
      await consumer.consume('test-queue', vi.fn().mockRejectedValue(new Error('Fail')));
      await waitFor(200);
      
      const dlqMessages = await consumer.getDeadLetterMessages('test-queue');
      expect(dlqMessages).toHaveLength(1);
      
      await consumer.requeueDeadLetterMessage(dlqMessages[0].id);
      
      const stop = await consumer.consume('test-queue', handler);
      await waitFor(100);
      await stop();
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});