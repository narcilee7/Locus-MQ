import { BaseHandler, LogFormatter, JsonFormatter } from './BaseHandler';
import { LogEntry } from '../../../types/logger/middleware';
import { FileLogConfig } from '../../../types/logger/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 文件日志处理器
 */
export class FileHandler extends BaseHandler {
  private config: FileLogConfig;
  private writeStream: fs.WriteStream | null = null;
  private currentSize = 0;
  private fileIndex = 0;

  constructor(level: number, config: FileLogConfig, formatter?: LogFormatter) {
    super(level, formatter || new JsonFormatter());
    this.config = {
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      compress: true,
      rotation: 'daily',
      ...config,
    };
    this.initialize();
  }

  private initialize(): void {
    this.ensureDirectoryExists();
    this.createWriteStream();
    this.updateCurrentSize();
  }

  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.config.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private createWriteStream(): void {
    const filePath = this.getCurrentFilePath();
    this.writeStream = fs.createWriteStream(filePath, { flags: 'a' });
  }

  private updateCurrentSize(): void {
    try {
      const stats = fs.statSync(this.getCurrentFilePath());
      this.currentSize = stats.size;
    } catch {
      this.currentSize = 0;
    }
  }

  private getCurrentFilePath(): string {
    if (this.config.rotation === 'size') {
      return this.config.path;
    }
    
    const date = new Date();
    const dateStr = this.formatDate(date);
    return this.config.path.replace(/\.log$/, `-${dateStr}.log`);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (this.config.rotation) {
      case 'daily':
        return `${year}-${month}-${day}`;
      case 'weekly':
        const week = this.getWeekNumber(date);
        return `${year}-W${week}`;
      case 'monthly':
        return `${year}-${month}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  private getWeekNumber(date: Date): string {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return String(Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)).padStart(2, '0');
  }

  private shouldRotate(): boolean {
    if (this.config.rotation === 'size') {
      return this.currentSize >= this.config.maxSize!;
    }
    
    // 检查日期变化
    const currentPath = this.getCurrentFilePath();
    return !fs.existsSync(currentPath);
  }

  private rotate(): void {
    if (this.writeStream) {
      this.writeStream.end();
    }
    
    if (this.config.compress) {
      this.compressOldFiles();
    }
    
    this.cleanupOldFiles();
    this.createWriteStream();
    this.currentSize = 0;
  }

  private compressOldFiles(): void {
    const dir = path.dirname(this.config.path);
    const basename = path.basename(this.config.path, '.log');
    
    try {
      const files = fs.readdirSync(dir)
        .filter(file => file.startsWith(basename) && file.endsWith('.log'))
        .sort()
        .reverse();
      
      // 这里可以实现压缩逻辑
      // 暂时跳过实际压缩实现
    } catch (error) {
      console.error('Error compressing old log files:', error);
    }
  }

  private cleanupOldFiles(): void {
    const dir = path.dirname(this.config.path);
    const basename = path.basename(this.config.path, '.log');
    
    try {
      const files = fs.readdirSync(dir)
        .filter(file => file.startsWith(basename) && file.endsWith('.log'))
        .sort()
        .reverse();
      
      if (files.length > this.config.maxFiles!) {
        const filesToDelete = files.slice(this.config.maxFiles!);
        for (const file of filesToDelete) {
          try {
            fs.unlinkSync(path.join(dir, file));
          } catch (error) {
            console.error(`Error deleting old log file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old log files:', error);
    }
  }

  async process(entry: LogEntry): Promise<void> {
    if (!this.writeStream) {
      throw new Error('Write stream not initialized');
    }

    if (this.shouldRotate()) {
      this.rotate();
    }

    const output = this.formatter.format(entry);
    this.writeStream.write(output + '\n');
    this.currentSize += Buffer.byteLength(output + '\n');
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve) => {
        this.writeStream!.end(resolve);
      });
    }
  }
}