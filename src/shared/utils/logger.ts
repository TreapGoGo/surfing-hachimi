type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  excerpt?: string;
}

type LogListener = (logs: LogEntry[]) => void;

export class Logger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 100;

  success(message: string, data?: any) {
    // 自动提取 data 中的摘要信息以供显示
    let excerpt = '';
    if (data && typeof data === 'object') {
      excerpt = data.contentExcerpt || data.excerpt || '';
    }
    this.addLog('success', message, data, excerpt);
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }

  private addLog(level: LogLevel, message: string, data?: any, excerpt?: string) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      level,
      message,
      data,
      excerpt // 显式记录摘要
    };
    this.logs = [...this.logs, entry].slice(-this.maxLogs);
    console.log(`[Hachimi ${level}] ${message}`, data || '');
    this.notify();
    
    // 广播日志。在浏览器环境下使用 CustomEvent，在 Service Worker 环境下仅 console.log
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('hachimi-log', { detail: entry }));
    }
  }

  syncLogs(newLogs: LogEntry[]) {
    this.logs = newLogs;
    this.notify();
  }

  subscribe(listener: LogListener) {
    this.listeners.add(listener);
    listener(this.logs);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }

  clear() {
    this.logs = [];
    this.notify();
  }

  getLogs() { return this.logs; }
}

export const logger = new Logger();
