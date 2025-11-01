import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import desktopDb from '../db.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ENV_VARS } = require('../../../shared/dist/cjs/index.js');


// Error categories for classification
export const ErrorCategory = {
  IPC: 'IPC',
  DATABASE: 'DATABASE',
  NETWORK: 'NETWORK',
  FILE_SYSTEM: 'FILE_SYSTEM',
  SECURITY: 'SECURITY',
  AUTHENTICATION: 'AUTHENTICATION',
  VALIDATION: 'VALIDATION',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
  SYSTEM: 'SYSTEM',
  RENDERER: 'RENDERER'
};

// Error severity levels
export const ErrorSeverity = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL'
};

// Error log entry structure
export class ErrorLogEntry {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.timestamp = data.timestamp || new Date().toISOString();
    this.level = data.level || ErrorSeverity.ERROR;
    this.category = data.category || ErrorCategory.SYSTEM;
    this.message = data.message || '';
    this.error = data.error;
    this.context = data.context || {};
    this.correlationId = data.correlationId;
    this.process = data.process || 'main';
    this.fileName = data.fileName;
    this.lineNumber = data.lineNumber;
    this.columnNumber = data.columnNumber;
  }

  generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

/**
 * Redacts sensitive keys from an object recursively.
 * Any key matching /^(authorization|token|refreshToken)$/i will have its value replaced.
 */
function redactSensitive(input) {
  try {
    if (input == null || typeof input !== 'object') return input;
    if (Array.isArray(input)) return input.map(redactSensitive);
    const SENSITIVE = /^(authorization|token|refreshToken)$/i;
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = SENSITIVE.test(k) ? '***REDACTED***' : redactSensitive(v);
    }
    return out;
  } catch {
    return input;
  }
}

/**
 * Desktop Error Logging Service
 * Provides structured error logging with file persistence and database storage
 */
class DesktopErrorLogger {
  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.logFile = path.join(this.logDir, 'desktop-errors.log');
    this.maxFileSizeMB = 10;
    this.maxLogFiles = 5;
    this.logLevel = ErrorSeverity.DEBUG;
    
    this.initialize();
  }

  initialize() {
    try {
      // Create logs directory if it doesn't exist
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      
      console.log('[DesktopErrorLogger] Initialized at:', this.logDir);
    } catch (error) {
      console.error('[DesktopErrorLogger] Failed to initialize:', error);
    }
  }

  /**
   * Log an error with structured data
   */
  log(level, category, message, error = null, context = {}, options = {}) {
    try {
      // Check if we should log based on severity level
      if (!this.shouldLog(level)) {
        return;
      }

      const logEntry = new ErrorLogEntry({
        level,
        category,
        message,
        error: error ? {
          name: error.name || 'Error',
          message: error.message || String(error),
          stack: error.stack
        } : undefined,
        context: redactSensitive(context),
        correlationId: options.correlationId,
        process: options.process || 'main',
        fileName: options.fileName,
        lineNumber: options.lineNumber,
        columnNumber: options.columnNumber
      });

      // Log to console
      this.logToConsole(logEntry);

      // Log to file
      this.logToFile(logEntry);

      // Store in database for later analysis
      this.storeInDatabase(logEntry);

      return logEntry.id;
    } catch (logError) {
      console.error('[DesktopErrorLogger] Failed to log error:', logError);
    }
  }

  /**
   * Check if error should be logged based on severity level
   */
  shouldLog(level) {
    const levelOrder = [ErrorSeverity.DEBUG, ErrorSeverity.INFO, ErrorSeverity.WARN, ErrorSeverity.ERROR, ErrorSeverity.FATAL];
    const currentLevelIndex = levelOrder.indexOf(this.logLevel);
    const entryLevelIndex = levelOrder.indexOf(level);
    
    return entryLevelIndex >= currentLevelIndex;
  }

  /**
   * Log to console with appropriate formatting
   */
  logToConsole(entry) {
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
   * Log to file with rotation
   */
  logToFile(entry) {
    try {
      this.rotateLogFileIfNeeded();

      const logLine = JSON.stringify(entry) + '\n';
      
      fs.appendFileSync(this.logFile, logLine, { encoding: 'utf8' });
    } catch (error) {
      console.error('[DesktopErrorLogger] Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log file if it exceeds maximum size
   */
  rotateLogFileIfNeeded() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        const fileSizeMB = stats.size / (1024 * 1024);

        if (fileSizeMB > this.maxFileSizeMB) {
          this.rotateLogFiles();
        }
      }
    } catch (error) {
      console.error('[DesktopErrorLogger] Failed to check log file size:', error);
    }
  }

  /**
   * Rotate log files
   */
  rotateLogFiles() {
    try {
      // Rotate existing log files
      for (let i = this.maxLogFiles - 1; i >= 0; i--) {
        const oldFile = i === 0 ? this.logFile : `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;

        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            // Remove oldest log file
            fs.unlinkSync(oldFile);
          } else {
            // Rename log file
            fs.renameSync(oldFile, newFile);
          }
        }
      }
    } catch (error) {
      console.error('[DesktopErrorLogger] Failed to rotate log files:', error);
    }
  }

  /**
   * Store error in database for later analysis
   */
  storeInDatabase(entry) {
    try {
      if (desktopDb && desktopDb.initialized) {
        // Store in KV store for error tracking
        desktopDb.setKeyValue(`error_${entry.id}`, {
          ...entry,
          storedAt: new Date().toISOString()
        });
        
        // Only queue FATAL errors for server reporting in production, or all errors if explicitly enabled
        const shouldQueueForSync = this.shouldQueueErrorForSync(entry);
        if (shouldQueueForSync) {
          console.log(`[DesktopErrorLogger] Queueing ${entry.level} error for sync: ${entry.message}`);
          desktopDb.enqueueEvent('error', 'desktop-main', {
            errorId: entry.id,
            level: entry.level,
            category: entry.category,
            message: entry.message,
            error: entry.error,
            context: entry.context,
            correlationId: entry.correlationId,
            process: entry.process
          }, {
            identityKey: `error_${entry.id}`,
            catalogKey: 'system_error'
          });
        }
      }
    } catch (error) {
      console.error('[DesktopErrorLogger] Failed to store error in database:', error);
    }
  }

  /**
   * Determine if an error should be queued for server sync
   * Only queue fatal errors in production, or if explicitly enabled via env var
   */
  shouldQueueErrorForSync(entry) {
    // If explicitly enabled, queue all errors
    if (process.env[ENV_VARS.ENABLE_ERROR_SYNC] === 'true') {
      return true;
    }
    
    // In production, only queue FATAL errors
    if (process.env[ENV_VARS.NODE_ENV] === 'production') {
      return entry.level === ErrorSeverity.FATAL;
    }
    
    // In development, don't queue any errors by default (prevents spam)
    return false;
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message, context = {}, category = ErrorCategory.SYSTEM) {
    return this.log(ErrorSeverity.DEBUG, category, message, null, context);
  }

  info(message, context = {}, category = ErrorCategory.SYSTEM) {
    return this.log(ErrorSeverity.INFO, category, message, null, context);
  }

  warn(message, error = null, context = {}, category = ErrorCategory.SYSTEM) {
    return this.log(ErrorSeverity.WARN, category, message, error, context);
  }

  error(message, error = null, context = {}, category = ErrorCategory.SYSTEM) {
    return this.log(ErrorSeverity.ERROR, category, message, error, context);
  }

  fatal(message, error = null, context = {}, category = ErrorCategory.SYSTEM) {
    return this.log(ErrorSeverity.FATAL, category, message, error, context);
  }

  /**
   * Specialized logging methods for common error types
   */
  logIpcError(method, error, context = {}) {
    return this.log(
      ErrorSeverity.ERROR,
      ErrorCategory.IPC,
      `IPC Error in ${method}`,
      error,
      { ...context, ipcMethod: method }
    );
  }

  logDatabaseError(operation, error, context = {}) {
    return this.log(
      ErrorSeverity.ERROR,
      ErrorCategory.DATABASE,
      `Database Error in ${operation}`,
      error,
      { ...context, dbOperation: operation }
    );
  }

  logNetworkError(endpoint, error, context = {}) {
    return this.log(
      ErrorSeverity.ERROR,
      ErrorCategory.NETWORK,
      `Network Error calling ${endpoint}`,
      error,
      { ...context, endpoint }
    );
  }

  logFileSystemError(operation, filePath, error, context = {}) {
    return this.log(
      ErrorSeverity.ERROR,
      ErrorCategory.FILE_SYSTEM,
      `File System Error in ${operation}: ${filePath}`,
      error,
      { ...context, operation, filePath }
    );
  }

  logSecurityError(operation, error, context = {}) {
    return this.log(
      ErrorSeverity.ERROR,
      ErrorCategory.SECURITY,
      `Security Error in ${operation}`,
      error,
      { ...context, operation }
    );
  }

  logAuthenticationError(operation, error, context = {}) {
    return this.log(
      ErrorSeverity.ERROR,
      ErrorCategory.AUTHENTICATION,
      `Authentication Error in ${operation}`,
      error,
      { ...context, operation }
    );
  }

  /**
   * Get recent errors from log file
   */
  getRecentErrors(limit = 100, hours = 24) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      const recentErrors = [];
      const since = Date.now() - (hours * 60 * 1000);

      // Parse lines in reverse order (most recent first)
      for (let i = lines.length - 1; i >= 0 && recentErrors.length < limit; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          const entryTime = new Date(entry.timestamp).getTime();
          
          if (entryTime >= since) {
            recentErrors.push(entry);
          } else {
            break; // Stop if we've gone past the time window
          }
        } catch (parseError) {
          // Skip malformed lines
          continue;
        }
      }

      return recentErrors.reverse(); // Return in chronological order
    } catch (error) {
      console.error('[DesktopErrorLogger] Failed to read recent errors:', error);
      return [];
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(hours = 24) {
    try {
      const errors = this.getRecentErrors(1000, hours);
      const stats = {
        total: errors.length,
        byLevel: {},
        byCategory: {},
        byProcess: {}
      };

      errors.forEach(error => {
        // Count by level
        stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
        
        // Count by category
        stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
        
        // Count by process
        stats.byProcess[error.process] = (stats.byProcess[error.process] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('[DesktopErrorLogger] Failed to get error stats:', error);
      return { total: 0, byLevel: {}, byCategory: {}, byProcess: {} };
    }
  }

  /**
   * Clear log file
   */
  clearLogs() {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '', { encoding: 'utf8' });
        console.log('[DesktopErrorLogger] Log file cleared');
      }
    } catch (error) {
      console.error('[DesktopErrorLogger] Failed to clear log file:', error);
    }
  }

  /**
   * Get log file path for debugging
   */
  getLogFilePath() {
    return this.logFile;
  }

  /**
   * Get log directory
   */
  getLogDirectory() {
    return this.logDir;
  }
}

// Export singleton instance
const errorLogger = new DesktopErrorLogger();
export default errorLogger;
