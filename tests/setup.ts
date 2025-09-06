import { beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';

// Test database path
export const TEST_DB_PATH = resolve(__dirname, './test-database.sqlite');

// Clean up test database before each test
beforeEach(() => {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
});

// Clean up test database after each test
afterEach(() => {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
});

// Test utilities
export const createTestConfig = () => ({
  dbPath: TEST_DB_PATH,
  logger: console,
});

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));