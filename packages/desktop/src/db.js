import { app } from 'electron';
import Database from 'better-sqlite3';
import path from 'node:path';

const SCHEMA_VERSION = 3; // Incremented for error logging support

/**
 * Desktop app SQLite database for offline/online hybrid caching.
 * Handles catalogs, profile snapshots, event queuing for sync, and error logging.
 */
class DesktopDb {
  constructor() {
    this.dbPath = path.join(app.getPath('userData'), 'attrition-desktop.db');
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize database connection and run migrations.
   * Call once during app startup.
   */
  init() {
    if (this.initialized) return this.db;

    try {
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');

      this.runMigrations();
      this.initialized = true;

      console.log('[Desktop] SQLite database initialized at:', this.dbPath);

      return this.db;
    } catch (err) {
      console.error('[Desktop] Database initialization failed:', err);
      throw err;
    }
  }

  /**
   * Run schema migrations if needed.
   */
  runMigrations() {
    const currentVersion = this.getSchemaVersion();

    if (currentVersion < SCHEMA_VERSION) {
      console.log(`[Desktop] Running database migrations from ${currentVersion} to ${SCHEMA_VERSION}`);

      // Create all tables in single transaction
      const migration = this.db.transaction(() => {
        // Schema version tracking
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Key-value store for settings/metadata
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Catalogs cache (game data: buildings, tech, units, defenses)
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS catalogs (
            key TEXT PRIMARY KEY,
            catalog_data TEXT NOT NULL,
            version TEXT,
            content_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Profile snapshot cache (user/empire data)
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS profile_snapshot (
            user_id TEXT PRIMARY KEY,
            device_id TEXT NOT NULL,
            snapshot_data TEXT NOT NULL,
            schema_version INTEGER DEFAULT 1,
            fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_profile_user_device
            ON profile_snapshot (user_id, device_id);
        `);

        // Enhanced event queue for offline/sync operations (Tier A only)
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS event_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            device_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'queued',
            dedupe_key TEXT,
            identity_key TEXT,           -- For idempotency per queue rules
            catalog_key TEXT,            -- Game catalog key for the item
            location_coord TEXT,         -- Base coordinate for base-scoped events
            empire_id TEXT,              -- Empire identifier
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME,            -- When successfully sent to server
            completed_at DATETIME,       -- When completed/acknowledged
            retries INTEGER DEFAULT 0,
            last_error TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_event_status_created
            ON event_queue (status, created_at);
          CREATE INDEX IF NOT EXISTS idx_event_dedupe
            ON event_queue (kind, dedupe_key);
          CREATE INDEX IF NOT EXISTS idx_event_identity
            ON event_queue (identity_key);
          CREATE INDEX IF NOT EXISTS idx_event_location
            ON event_queue (location_coord, status);
          CREATE INDEX IF NOT EXISTS idx_event_empire
            ON event_queue (empire_id, status);
          CREATE INDEX IF NOT EXISTS idx_event_kind_status
            ON event_queue (kind, status, created_at);
        `);

        // Sync state tracking
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sync_state (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Error logging table for structured error storage
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS error_logs (
            id TEXT PRIMARY KEY,
            timestamp DATETIME NOT NULL,
            level TEXT NOT NULL,
            category TEXT NOT NULL,
            message TEXT NOT NULL,
            error_name TEXT,
            error_message TEXT,
            error_stack TEXT,
            context TEXT,
            correlation_id TEXT,
            process TEXT NOT NULL,
            file_name TEXT,
            line_number INTEGER,
            column_number INTEGER,
            user_agent TEXT,
            url TEXT,
            user_id TEXT,
            component_stack TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp
            ON error_logs (timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_error_logs_level
            ON error_logs (level, timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_error_logs_category
            ON error_logs (category, timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_error_logs_process
            ON error_logs (process, timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_error_logs_correlation
            ON error_logs (correlation_id, timestamp DESC);
        `);

        // Performance monitoring table for sync operations
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sync_performance_metrics (
            id TEXT PRIMARY KEY,
            operation TEXT NOT NULL,
            duration_ms INTEGER NOT NULL,
            timestamp DATETIME NOT NULL,
            success BOOLEAN NOT NULL DEFAULT 1,
            batch_size INTEGER,
            error_message TEXT,
            context TEXT,
            correlation_id TEXT,
            process TEXT NOT NULL DEFAULT 'main',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_sync_perf_timestamp
            ON sync_performance_metrics (timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_sync_perf_operation
            ON sync_performance_metrics (operation, timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_sync_perf_success
            ON sync_performance_metrics (success, timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_sync_perf_process
            ON sync_performance_metrics (process, timestamp DESC);
        `);

        // Update schema version
        this.setSchemaVersion(SCHEMA_VERSION);
        console.log(`[Desktop] Database schema updated to version ${SCHEMA_VERSION}`);
      });

      migration();
    }
  }

  getSchemaVersion() {
    try {
      const stmt = this.db.prepare(`
        SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
      `);
      const row = stmt.get();
      return row?.version || 0;
    } catch (err) {
      return 0;
    }
  }

  setSchemaVersion(version) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO schema_version (version, updated_at)
      VALUES (?, CURRENT_TIMESTAMP)
    `);
    stmt.run(version);
  }

  // ===== KV STORE OPERATIONS =====

  setKeyValue(key, value) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO kv_store (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      const result = stmt.run(key, JSON.stringify(value));
      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] KV store set failed:', err, { key });
      return false;
    }
  }

  getKeyValue(key) {
    try {
      const stmt = this.db.prepare(`
        SELECT value FROM kv_store WHERE key = ?
      `);
      const row = stmt.get(key);
      return row ? JSON.parse(row.value) : null;
    } catch (err) {
      console.error('[DesktopDb] KV store get failed:', err, { key });
      return null;
    }
  }

  deleteKeyValue(key) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM kv_store WHERE key = ?
      `);
      const result = stmt.run(key);
      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] KV store delete failed:', err, { key });
      return false;
    }
  }

  // ===== CATALOGS OPERATIONS =====

  setCatalog(key, catalogData, version = null, contentHash = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO catalogs
          (key, catalog_data, version, content_hash, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      const result = stmt.run(
        key,
        JSON.stringify(catalogData),
        version,
        contentHash
      );
      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] Catalog set failed:', err, { key, version });
      return false;
    }
  }

  getCatalog(key) {
    try {
      const stmt = this.db.prepare(`
        SELECT catalog_data, version, content_hash, updated_at
        FROM catalogs WHERE key = ?
      `);
      const row = stmt.get(key);
      if (!row) return null;

      return {
        data: JSON.parse(row.catalog_data),
        version: row.version,
        contentHash: row.content_hash,
        updatedAt: row.updated_at
      };
    } catch (err) {
      console.error('[DesktopDb] Catalog get failed:', err, { key });
      return null;
    }
  }

  getAllCatalogs() {
    try {
      const stmt = this.db.prepare(`
        SELECT key, catalog_data, version, content_hash, updated_at
        FROM catalogs
        ORDER BY key
      `);
      const rows = stmt.all();

      return rows.reduce((acc, row) => ({
        ...acc,
        [row.key]: {
          data: JSON.parse(row.catalog_data),
          version: row.version,
          contentHash: row.content_hash,
          updatedAt: row.updated_at
        }
      }), {});
    } catch (err) {
      console.error('[DesktopDb] Get all catalogs failed:', err);
      return {};
    }
  }

  // ===== PROFILE SNAPSHOT OPERATIONS =====

  setProfileSnapshot(userId, deviceId, snapshotData, schemaVersion = 1) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO profile_snapshot
          (user_id, device_id, snapshot_data, schema_version, fetched_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      const result = stmt.run(
        userId,
        deviceId,
        JSON.stringify(snapshotData),
        schemaVersion
      );
      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] Profile snapshot set failed:', err, { userId, deviceId });
      return false;
    }
  }

  getProfileSnapshot(userId, deviceId) {
    try {
      const stmt = this.db.prepare(`
        SELECT snapshot_data, schema_version, fetched_at
        FROM profile_snapshot
        WHERE user_id = ? AND device_id = ?
      `);
      const row = stmt.get(userId, deviceId);
      if (!row) return null;

      return {
        data: JSON.parse(row.snapshot_data),
        schemaVersion: row.schema_version,
        fetchedAt: row.fetched_at
      };
    } catch (err) {
      console.error('[DesktopDb] Profile snapshot get failed:', err, { userId, deviceId });
      return null;
    }
  }

  // ===== EVENT QUEUE OPERATIONS =====

  /**
   * Enhanced enqueue with idempotency support and proper indexing
   */
  enqueueEvent(kind, deviceId, payload, options = {}) {
    const {
      dedupeKey = null,
      identityKey = null,
      catalogKey = null,
      locationCoord = null,
      empireId = null
    } = options;

    try {
      // Check for existing identical pending event (idempotency)
      if (identityKey) {
        const existingStmt = this.db.prepare(`
          SELECT id FROM event_queue 
          WHERE identity_key = ? AND status IN ('queued', 'sent')
          LIMIT 1
        `);
        const existing = existingStmt.get(identityKey);
        if (existing) {
          console.log(`[DesktopDb] Idempotent skip for identityKey=${identityKey}`);
          return existing.id;
        }
      }

      const stmt = this.db.prepare(`
        INSERT INTO event_queue
          (kind, device_id, payload, dedupe_key, identity_key, catalog_key, location_coord, empire_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      const result = stmt.run(
        kind,
        deviceId,
        JSON.stringify(payload),
        dedupeKey,
        identityKey,
        catalogKey,
        locationCoord,
        empireId
      );

      return result.lastInsertRowid;
    } catch (err) {
      console.error('[DesktopDb] Event enqueue failed:', err, { 
        kind, 
        deviceId, 
        identityKey, 
        catalogKey 
      });
      throw err;
    }
  }

  /**
   * Dequeue events for flush with enhanced filtering and status management
   */
  dequeueEventsForFlush(limit = 50, kind = null) {
    try {
      let sql = `
        SELECT id, kind, device_id, payload, dedupe_key, identity_key, catalog_key, location_coord, empire_id, created_at
        FROM event_queue
        WHERE status = 'queued'
      `;
      
      const params = [];
      if (kind) {
        sql += ` AND kind = ?`;
        params.push(kind);
      }
      
      sql += ` ORDER BY created_at ASC LIMIT ?`;
      params.push(limit);

      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params);

      return rows.map(row => ({
        id: row.id,
        kind: row.kind,
        deviceId: row.device_id,
        payload: JSON.parse(row.payload),
        dedupeKey: row.dedupe_key,
        identityKey: row.identity_key,
        catalogKey: row.catalog_key,
        locationCoord: row.location_coord,
        empireId: row.empire_id,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('[DesktopDb] Event dequeue failed:', err, { limit, kind });
      return [];
    }
  }

  /**
   * Mark event as successfully sent to server
   */
  markEventSent(eventId) {
    try {
      const stmt = this.db.prepare(`
        UPDATE event_queue
        SET status = 'sent', 
            sent_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(eventId);
      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] Mark event sent failed:', err, { eventId });
      return false;
    }
  }

  /**
   * Mark event as failed with error tracking
   */
  markEventFailed(eventId, errorMessage) {
    try {
      const stmt = this.db.prepare(`
        UPDATE event_queue
        SET status = 'failed',
            last_error = ?,
            retries = retries + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(errorMessage, eventId);
      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] Mark event failed failed:', err, { eventId, errorMessage });
      return false;
    }
  }

  /**
   * Mark event as completed/acknowledged by server
   */
  markEventCompleted(eventId) {
    try {
      const stmt = this.db.prepare(`
        UPDATE event_queue
        SET status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(eventId);
      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] Mark event completed failed:', err, { eventId });
      return false;
    }
  }

  /**
   * Get pending events count by kind
   */
  getPendingEventsCount(kind = null) {
    try {
      let sql = `SELECT COUNT(*) as count FROM event_queue WHERE status = 'queued'`;
      const params = [];
      
      if (kind) {
        sql += ` AND kind = ?`;
        params.push(kind);
      }
      
      const stmt = this.db.prepare(sql);
      const row = stmt.get(...params);
      return row?.count || 0;
    } catch (err) {
      console.error('[DesktopDb] Get pending events count failed:', err, { kind });
      return 0;
    }
  }

  /**
   * Get events by identity key for idempotency checks
   */
  getEventsByIdentityKey(identityKey) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, kind, status, created_at, sent_at, completed_at
        FROM event_queue 
        WHERE identity_key = ?
        ORDER BY created_at DESC
      `);
      return stmt.all(identityKey);
    } catch (err) {
      console.error('[DesktopDb] Get events by identity key failed:', err, { identityKey });
      return [];
    }
  }

  /**
   * Delete old sent events for cleanup
   */
  deleteOldSentEvents(olderThanDays = 7) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM event_queue
        WHERE status IN ('sent', 'completed') 
        AND updated_at < datetime('now', '-${olderThanDays} days')
      `);
      const result = stmt.run();
      return result.changes;
    } catch (err) {
      console.error('[DesktopDb] Delete old sent events failed:', err, { olderThanDays });
      return 0;
    }
  }

  /**
   * Get event statistics for monitoring
   */
  getEventStats() {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          kind,
          status,
          COUNT(*) as count,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM event_queue 
        GROUP BY kind, status
        ORDER BY kind, status
      `);
      return stmt.all();
    } catch (err) {
      console.error('[DesktopDb] Get event stats failed:', err);
      return [];
    }
  }

  // ===== SYNC STATE OPERATIONS =====

  setSyncState(key, value) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sync_state (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      const result = stmt.run(key, JSON.stringify(value));
      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] Sync state set failed:', err, { key });
      return false;
    }
  }

  getSyncState(key) {
    try {
      const stmt = this.db.prepare(`
        SELECT value FROM sync_state WHERE key = ?
      `);
      const row = stmt.get(key);
      return row ? JSON.parse(row.value) : null;
    } catch (err) {
      console.error('[DesktopDb] Sync state get failed:', err, { key });
      return null;
    }
  }

  /**
   * Clear cached content that depends on bootstrap version.
   * Preserves event_queue, kv_store, sync_state, error_logs, and perf metrics.
   * Intended to be called when a cache version mismatch is detected.
   */
  clearCachedContent() {
    try {
      const tx = this.db.transaction(() => {
        // Remove versioned cached content
        this.db.exec(`DELETE FROM catalogs;`);
        this.db.exec(`DELETE FROM profile_snapshot;`);
      });
      tx();
      console.log('[DesktopCache] Cleared catalogs and profile_snapshot caches due to version mismatch');
      return true;
    } catch (err) {
      console.error('[DesktopDb] Failed to clear cached content:', err);
      return false;
    }
  }

  // ===== ERROR LOGGING OPERATIONS =====

  /**
   * Log an error to the database
   */
  logError(entry) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO error_logs
          (id, timestamp, level, category, message, error_name, error_message, error_stack, 
           context, correlation_id, process, file_name, line_number, column_number, 
           user_agent, url, user_id, component_stack, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      const result = stmt.run(
        entry.id || this.generateId(),
        entry.timestamp || new Date().toISOString(),
        entry.level || 'ERROR',
        entry.category || 'SYSTEM',
        entry.message || 'Unknown error',
        entry.error?.name || null,
        entry.error?.message || null,
        entry.error?.stack || null,
        entry.context ? JSON.stringify(entry.context) : null,
        entry.correlationId || null,
        entry.process || 'main',
        entry.fileName || null,
        entry.lineNumber || null,
        entry.columnNumber || null,
        entry.userAgent || null,
        entry.url || null,
        entry.userId || null,
        entry.componentStack || null
      );

      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] Database error logging failed:', err, { 
        level: entry.level, 
        category: entry.category, 
        message: entry.message 
      });
      return false;
    }
  }

  // ===== PERFORMANCE MONITORING OPERATIONS =====

  /**
   * Log performance metrics for sync operations
   */
  logSyncPerformanceMetric(metric) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sync_performance_metrics
          (id, operation, duration_ms, timestamp, success, batch_size, error_message, 
           context, correlation_id, process, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      const result = stmt.run(
        metric.id || this.generateId(),
        metric.operation,
        metric.durationMs,
        metric.timestamp || Date.now(),
        metric.success ? 1 : 0,
        metric.batchSize || null,
        metric.error || null,
        metric.context ? JSON.stringify(metric.context) : null,
        metric.correlationId || null,
        metric.process || 'main'
      );

      return result.changes > 0;
    } catch (err) {
      console.error('[DesktopDb] Sync performance metric logging failed:', err, { 
        operation: metric.operation,
        durationMs: metric.durationMs,
        success: metric.success
      });
      return false;
    }
  }

  /**
   * Get recent sync performance metrics
   */
  getRecentSyncPerformanceMetrics(hours = 24) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, operation, duration_ms, timestamp, success, batch_size, error_message,
               context, correlation_id, process
        FROM sync_performance_metrics
        WHERE timestamp >= datetime('now', '-${hours} hours')
        ORDER BY timestamp DESC
        LIMIT 1000
      `);
      
      const rows = stmt.all();
      
      return rows.map(row => ({
        id: row.id,
        operation: row.operation,
        durationMs: row.duration_ms,
        timestamp: row.timestamp,
        success: row.success === 1,
        batchSize: row.batch_size,
        error: row.error_message,
        context: row.context ? JSON.parse(row.context) : undefined,
        correlationId: row.correlation_id,
        process: row.process
      }));
    } catch (err) {
      console.error('[DesktopDb] Get recent sync performance metrics failed:', err, { hours });
      return [];
    }
  }

  /**
   * Get sync performance statistics
   */
  getSyncPerformanceStats(hours = 24) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          operation,
          COUNT(*) as total_count,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
          AVG(duration_ms) as avg_duration_ms,
          MIN(duration_ms) as min_duration_ms,
          MAX(duration_ms) as max_duration_ms,
          SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) as error_count
        FROM sync_performance_metrics
        WHERE timestamp >= datetime('now', '-${hours} hours')
        GROUP BY operation
        ORDER BY total_count DESC
      `);
      
      return stmt.all();
    } catch (err) {
      console.error('[DesktopDb] Get sync performance stats failed:', err, { hours });
      return [];
    }
  }

  /**
   * Clear sync performance metrics
   */
  clearSyncPerformanceMetrics(olderThanDays = 30) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM sync_performance_metrics
        WHERE timestamp < datetime('now', '-${olderThanDays} days')
      `);
      
      const result = stmt.run();
      return result.changes;
    } catch (err) {
      console.error('[DesktopDb] Clear sync performance metrics failed:', err, { olderThanDays });
      return 0;
    }
  }

  /**
   * Generate unique ID for performance metrics
   */
  generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get recent errors from the database
   */
  getRecentErrors(hours = 24) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, timestamp, level, category, message, error_name, error_message, error_stack,
               context, correlation_id, process, file_name, line_number, column_number,
               user_agent, url, user_id, component_stack
        FROM error_logs
        WHERE timestamp >= datetime('now', '-${hours} hours')
        ORDER BY timestamp DESC
        LIMIT 1000
      `);
      
      const rows = stmt.all();
      
      return rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        level: row.level,
        category: row.category,
        message: row.message,
        error: row.error_name ? {
          name: row.error_name,
          message: row.error_message,
          stack: row.error_stack
        } : undefined,
        context: row.context ? JSON.parse(row.context) : undefined,
        correlationId: row.correlation_id,
        process: row.process,
        fileName: row.file_name,
        lineNumber: row.line_number,
        columnNumber: row.column_number,
        userAgent: row.user_agent,
        url: row.url,
        userId: row.user_id,
        componentStack: row.component_stack
      }));
    } catch (err) {
      console.error('[DesktopDb] Get recent errors failed:', err, { hours });
      return [];
    }
  }

  /**
   * Get error statistics from the database
   */
  getErrorStats(hours = 24) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          level,
          category,
          process,
          COUNT(*) as count,
          MIN(timestamp) as first_occurrence,
          MAX(timestamp) as last_occurrence
        FROM error_logs
        WHERE timestamp >= datetime('now', '-${hours} hours')
        GROUP BY level, category, process
        ORDER BY count DESC, last_occurrence DESC
      `);
      
      return stmt.all();
    } catch (err) {
      console.error('[DesktopDb] Get error stats failed:', err, { hours });
      return [];
    }
  }

  /**
   * Delete old error logs for cleanup
   */
  deleteOldErrorLogs(olderThanDays = 30) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM error_logs
        WHERE timestamp < datetime('now', '-${olderThanDays} days')
      `);
      
      const result = stmt.run();
      return result.changes;
    } catch (err) {
      console.error('[DesktopDb] Delete old error logs failed:', err, { olderThanDays });
      return 0;
    }
  }

  /**
   * Clear all error logs
   */
  clearErrorLogs() {
    try {
      const stmt = this.db.prepare('DELETE FROM error_logs');
      const result = stmt.run();
      return result.changes;
    } catch (err) {
      console.error('[DesktopDb] Clear error logs failed:', err);
      return 0;
    }
  }

  /**
   * Export error logs
   */
  exportErrorLogs(format = 'json', hours = 24) {
    try {
      const errors = this.getRecentErrors(hours);
      
      if (format === 'csv') {
        return this.convertErrorsToCSV(errors);
      } else {
        return JSON.stringify(errors, null, 2);
      }
    } catch (err) {
      console.error('[DesktopDb] Export error logs failed:', err, { format, hours });
      return '';
    }
  }

  /**
   * Convert errors to CSV format
   */
  convertErrorsToCSV(errors) {
    if (errors.length === 0) return '';

    // CSV headers
    const headers = [
      'timestamp', 'level', 'category', 'process', 'message', 'errorMessage', 
      'fileName', 'lineNumber', 'columnNumber', 'url', 'userAgent'
    ];
    
    // Convert each error to CSV row
    const rows = errors.map(error => {
      return [
        error.timestamp,
        error.level,
        error.category,
        error.process,
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

  // ===== CLEANUP =====

  close() {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        this.initialized = false;
        console.log('[Desktop] SQLite database closed');
      } catch (err) {
        console.error('[Desktop] Failed to close database:', err);
      }
    }
  }

  // ===== HEALTH CHECK =====

  getHealthInfo() {
    try {
      const fileSize = require('node:fs').statSync(this.dbPath).size;

      // Get table counts
      const counts = {};
      const tables = [
        'kv_store', 'catalogs', 'profile_snapshot',
        'event_queue', 'sync_state', 'error_logs'
      ];

      for (const table of tables) {
        try {
          const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
          counts[table] = stmt.get().count;
        } catch (err) {
          console.warn('[Desktop] Failed to get table count:', err, { table });
          counts[table] = -1; // Indicate error
        }
      }

      return {
        connected: true,
        fileSize,
        tableCounts: counts,
        schemaVersion: this.getSchemaVersion(),
        dbPath: this.dbPath
      };
    } catch (err) {
      console.error('[Desktop] Database health check failed:', err);
      return {
        connected: false,
        error: err.message,
        dbPath: this.dbPath
      };
    }
  }
}

// Export singleton instance
export default new DesktopDb();
