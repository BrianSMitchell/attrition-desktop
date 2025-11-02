/**
 * Type definitions for Attrition Desktop package
 */

// HTTP Client types
export interface HttpRequestParams {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  tag?: string;
  validateSsl?: boolean;
}

export interface HttpResponse {
  ok: boolean;
  status?: number;
  json?: any;
  text?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  durationMs?: number;
}

// Network status types
export interface NetworkStatus {
  isOnline: boolean;
  isApiReachable: boolean;
  lastChecked: number;
  latencyMs: number;
}

// Error logger types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerContext {
  [key: string]: any;
}

export interface Logger {
  debug(message: string, error?: Error | null, context?: LoggerContext): void;
  info(message: string, error?: Error | null, context?: LoggerContext): void;
  warn(message: string, error?: Error | null, context?: LoggerContext): void;
  error(message: string, error?: Error | unknown, context?: LoggerContext): void;
  fatal(message: string, error?: Error | unknown, context?: LoggerContext): void;
}
