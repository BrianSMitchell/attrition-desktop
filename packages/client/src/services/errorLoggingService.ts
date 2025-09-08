// Client-side Error Logging Service for React application
// Provides structured error logging with console output and localStorage persistence

// Error severity levels
export enum ErrorSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

// Error categories for classification
export enum ErrorCategory {
  UI = 'UI',
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  DATA_FETCHING = 'DATA_FETCHING',
  STATE_MANAGEMENT = 'STATE_MANAGEMENT',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  SYSTEM = 'SYSTEM',
  RENDERER = 'RENDERER',
  COMPONENT = 'COMPONENT',
  HOOK = 'HOOK',
  SERVICE = 'SERVICE',
  STORE = 'STORE',
  SOCKET = 'SOCKET',
  IPC = 'IPC',
  DATABASE = 'DATABASE',
  FILE_SYSTEM = 'FILE_SYSTEM',
  SECURITY = 'SECURITY'
}

// Error log entry structure
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, any>;
  correlationId?: string;
  process: 'main' | 'renderer';
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  userAgent?: string;
  url?: string;
  userId?: string;
  componentStack?: string;
}

/**
 * Redacts sensitive keys from an object recursively.
 * Any key matching /^(authorization|token|refreshToken)$/i will have its value replaced.
 */
function redactSensitive(input: any): any {
  try {
    if (input == null || typeof input !== 'object') return input;
    if (Array.isArray(input)) return input.map(redactSensitive);
    const SENSITIVE = /^(authorization|token|refreshToken)$/i;
    const out: any = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = SENSITIVE.test(k) ? '***REDACTED***' : redactSensitive(v as any);
    }
    return out;
  } catch {
    return input;
  }
}

/**
 * Client-side Error Logging Service
 * Provides structured error logging with localStorage persistence
 */
class ClientErrorLogger {
  private logLevel: ErrorSeverity = ErrorSeverity.DEBUG;
  private maxLocalStorageEntries: number = 100;
  private localStorageKey: string = 'attrition_client_errors';

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      console.log('[ClientErrorLogger] Initialized');
    } catch (error) {
      console.error('[ClientErrorLogger] Failed to initialize:', error);
    }
  }

  /**
   * Log an error with structured data
   */
  public logError(entry: {
    level: ErrorSeverity;
    category: ErrorCategory;
    message: string;
    error?: {
      name: string;
      message: string;
      stack?: string;
    };
    context?: Record<string, any>;
    correlationId?: string;
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
    componentStack?: string;
  }) {
    try {
      const sanitized = {
        ...entry,
        context: redactSensitive(entry.context || {})
      };
      const logEntry: ErrorLogEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        process: 'renderer',
        ...sanitized
      };

      // Check if we should log based on severity level
      if (!this.shouldLog(entry.level)) {
        return;
      }

      // Log to console
      this.logToConsole(logEntry);

      // Log to localStorage for offline storage
      this.logToLocalStorage(logEntry);

      return logEntry.id;
    } catch (logError) {
      console.error('[ClientErrorLogger] Failed to log error:', logError);
    }
  }

  /**
   * Check if error should be logged based on severity level
   */
  private shouldLog(level: ErrorSeverity): boolean {
    const levelOrder = [
      ErrorSeverity.DEBUG,
      ErrorSeverity.INFO,
      ErrorSeverity.WARN,
      ErrorSeverity.ERROR,
      ErrorSeverity.FATAL
    ];
    const currentLevelIndex = levelOrder.indexOf(this.logLevel);
    const entryLevelIndex = levelOrder.indexOf(level);
    
    return entryLevelIndex >= currentLevelIndex;
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(entry: ErrorLogEntry) {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const location = entry.fileName ? `${entry.fileName}:${entry.lineNumber || '?'}:${entry.columnNumber || '?'}` : '';
    const locationStr = location ? ` [${location}]` : '';
    
    let logMessage = `[${timestamp}] [${entry.level}] [${entry.category}] [${entry.process}]${locationStr} ${entry.message}`;
    
    if (entry.error) {
      logMessage += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        logMessage += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      logMessage += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.correlationId) {
      logMessage += `\n  Correlation ID: ${entry.correlationId}`;
    }

    if (entry.componentStack) {
      logMessage += `\n  Component Stack: ${entry.componentStack}`;
    }

    switch (entry.level) {
      case ErrorSeverity.DEBUG:
        console.debug(logMessage);
        break;
      case ErrorSeverity.INFO:
        console.info(logMessage);
        break;
      case ErrorSeverity.WARN:
        console.warn(logMessage);
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.FATAL:
        console.error(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  /**
   * Log to localStorage for offline storage
   */
  private logToLocalStorage(entry: ErrorLogEntry) {
    try {
      const existingLogs = this.getStoredLogs();
      const updatedLogs = [...existingLogs, entry].slice(-this.maxLocalStorageEntries);
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('[ClientErrorLogger] Failed to store error in localStorage:', error);
    }
  }

  /**
   * Get stored logs from localStorage
   */
  private getStoredLogs(): ErrorLogEntry[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[ClientErrorLogger] Failed to get stored logs:', error);
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  public clearStoredLogs() {
    try {
      localStorage.removeItem(this.localStorageKey);
      console.log('[ClientErrorLogger] Stored logs cleared');
    } catch (error) {
      console.error('[ClientErrorLogger] Failed to clear stored logs:', error);
    }
  }

  /**
   * Get recent errors from localStorage
   */
  public getRecentErrors(hours: number = 24): ErrorLogEntry[] {
    try {
      const logs = this.getStoredLogs();
      const since = Date.now() - (hours * 60 * 1000);
      
      return logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= since;
      }).sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    } catch (error) {
      console.error('[ClientErrorLogger] Failed to get recent errors:', error);
      return [];
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStats(hours: number = 24) {
    try {
      const errors = this.getRecentErrors(hours);
      const stats = {
        total: errors.length,
        byLevel: {} as Record<string, number>,
        byCategory: {} as Record<string, number>
      };

      errors.forEach(error => {
        // Count by level
        stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
        
        // Count by category
        stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('[ClientErrorLogger] Failed to get error stats:', error);
      return { total: 0, byLevel: {}, byCategory: {} };
    }
  }

  /**
   * Generate unique ID for error entries
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Convenience methods for different log levels
   */
  public debug(message: string, context: Record<string, any> = {}, category: ErrorCategory = ErrorCategory.SYSTEM) {
    return this.logError({
      level: ErrorSeverity.DEBUG,
      category,
      message,
      context
    });
  }

  public info(message: string, context: Record<string, any> = {}, category: ErrorCategory = ErrorCategory.SYSTEM) {
    return this.logError({
      level: ErrorSeverity.INFO,
      category,
      message,
      context
    });
  }

  public warn(message: string, error: Error | null = null, context: Record<string, any> = {}, category: ErrorCategory = ErrorCategory.SYSTEM) {
    return this.logError({
      level: ErrorSeverity.WARN,
      category,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context
    });
  }

  public error(message: string, error: Error | null = null, context: Record<string, any> = {}, category: ErrorCategory = ErrorCategory.SYSTEM) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context
    });
  }

  public fatal(message: string, error: Error | null = null, context: Record<string, any> = {}, category: ErrorCategory = ErrorCategory.SYSTEM) {
    return this.logError({
      level: ErrorSeverity.FATAL,
      category,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context
    });
  }

  /**
   * Specialized logging methods for common error types
   */
  public logNetworkError(endpoint: string, error: any, context: Record<string, any> = {}) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category: ErrorCategory.NETWORK,
      message: `Network Error calling ${endpoint}`,
      error: {
        name: error.name || 'NetworkError',
        message: error.message || String(error),
        stack: error.stack
      },
      context: {
        ...context,
        endpoint
      }
    });
  }

  public logAuthenticationError(operation: string, error: any, context: Record<string, any> = {}) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category: ErrorCategory.AUTHENTICATION,
      message: `Authentication Error in ${operation}`,
      error: {
        name: error.name || 'AuthError',
        message: error.message || String(error),
        stack: error.stack
      },
      context: {
        ...context,
        operation
      }
    });
  }

  public logDataFetchingError(resource: string, error: any, context: Record<string, any> = {}) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category: ErrorCategory.DATA_FETCHING,
      message: `Data Fetching Error for ${resource}`,
      error: {
        name: error.name || 'DataFetchError',
        message: error.message || String(error),
        stack: error.stack
      },
      context: {
        ...context,
        resource
      }
    });
  }

  public logStateManagementError(store: string, error: any, context: Record<string, any> = {}) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category: ErrorCategory.STATE_MANAGEMENT,
      message: `State Management Error in ${store}`,
      error: {
        name: error.name || 'StateError',
        message: error.message || String(error),
        stack: error.stack
      },
      context: {
        ...context,
        store
      }
    });
  }

  public logComponentError(component: string, error: any, componentStack?: string, context: Record<string, any> = {}) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category: ErrorCategory.COMPONENT,
      message: `Component Error in ${component}`,
      error: {
        name: error.name || 'ComponentError',
        message: error.message || String(error),
        stack: error.stack
      },
      componentStack,
      context: {
        ...context,
        component
      }
    });
  }

  public logHookError(hook: string, error: any, context: Record<string, any> = {}) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category: ErrorCategory.HOOK,
      message: `Hook Error in ${hook}`,
      error: {
        name: error.name || 'HookError',
        message: error.message || String(error),
        stack: error.stack
      },
      context: {
        ...context,
        hook
      }
    });
  }

  public logServiceError(service: string, error: any, context: Record<string, any> = {}) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category: ErrorCategory.SERVICE,
      message: `Service Error in ${service}`,
      error: {
        name: error.name || 'ServiceError',
        message: error.message || String(error),
        stack: error.stack
      },
      context: {
        ...context,
        service
      }
    });
  }

  public logStoreError(store: string, error: any, context: Record<string, any> = {}) {
    return this.logError({
      level: ErrorSeverity.ERROR,
      category: ErrorCategory.STORE,
      message: `Store Error in ${store}`,
      error: {
        name: error.name || 'StoreError',
        message: error.message || String(error),
        stack: error.stack
      },
      context: {
        ...context,
        store
      }
    });
  }

  /**
   * Export errors for external analysis
   */
  public exportErrors(format: 'json' | 'csv' = 'json', hours: number = 24): string {
    try {
      const errors = this.getRecentErrors(hours);
      
      if (format === 'csv') {
        return this.convertToCSV(errors);
      } else {
        return JSON.stringify(errors, null, 2);
      }
    } catch (error) {
      console.error('[ClientErrorLogger] Failed to export errors:', error);
      return '';
    }
  }

  /**
   * Convert errors to CSV format
   */
  private convertToCSV(errors: ErrorLogEntry[]): string {
    if (errors.length === 0) return '';

    // CSV headers
    const headers = [
      'timestamp', 'level', 'category', 'message', 'errorMessage', 
      'fileName', 'lineNumber', 'columnNumber', 'url', 'userAgent'
    ];
    
    // Convert each error to CSV row
    const rows = errors.map(error => {
      return [
        error.timestamp,
        error.level,
        error.category,
        `"${error.message.replace(/"/g, '""')}"`,
        error.error ? `"${(error.error.message || '').replace(/"/g, '""')}"` : '',
        error.fileName || '',
        error.lineNumber || '',
        error.columnNumber || '',
        error.url || '',
        `"${(error.userAgent || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get system information for error context
   */
  public getSystemInfo(): any {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      url: window.location.href,
      referrer: document.referrer
    };
  }
}

// Export singleton instance
const clientErrorLogger = new ClientErrorLogger();
export default clientErrorLogger;
