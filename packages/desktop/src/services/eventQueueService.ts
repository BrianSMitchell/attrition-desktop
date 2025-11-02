import desktopDb from "../db.js";

interface PerformanceMetric {
  timestamp: number;
  operation: string;
  success: boolean;
  durationMs: number;
  batchSize?: number;
  error?: string;
}

interface PerformanceStats {
  totalOperations: number;
  successRate: number;
  averageDurationMs: number;
  medianDurationMs?: number;
  p95DurationMs?: number;
  p99DurationMs?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  operationsByType: Record<string, {
    count: number;
    successRate: number;
    avgDuration: number;
  }>;
  errorDistribution: Record<string, number>;
  throughput?: {
    operationsPerMinute: number;
    bytesPerSecond: number;
  };
}

/**
 * Event Queue Service for handling offline/online hybrid operations
 * Implements Tier A event queue system with idempotency and synchronization
 * Enhanced with performance monitoring for sync operations
 */
class EventQueueService {
  private flushInterval: NodeJS.Timeout | null;
  private isFlushing: boolean;
  private deviceId: string;
  private performanceMetrics: Map<string, PerformanceMetric[]>;
  private isMonitoringEnabled: boolean;

  constructor() {
    // State
    this.flushInterval = null;
    this.isFlushing = false;
    this.deviceId = this.getDeviceId();
    this.performanceMetrics = new Map();
    this.isMonitoringEnabled = true;

    this.initializePerformanceMonitoring();
  }

  private getDeviceId(): string {
    // Stub - implement device ID generation
    return 'device-' + Math.random().toString(36).substring(7);
  }

  private initializePerformanceMonitoring(): void {
    // Initialize performance metrics storage
    this.performanceMetrics.set("eventProcessing", []);
    this.performanceMetrics.set("batchFlush", []);
    this.performanceMetrics.set("networkOperations", []);
    this.performanceMetrics.set("databaseOperations", []);
    this.performanceMetrics.set("syncOperations", []);
  }

  /**
   * Record performance metrics for sync operations
   */
  recordPerformanceMetric(metric: Partial<PerformanceMetric>): void {
    if (!this.isMonitoringEnabled) return;

    const fullMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    const metrics = this.performanceMetrics.get("syncOperations") || [];
    metrics.push(fullMetric);

    // Keep only last 1000 metrics to prevent memory bloat
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    this.performanceMetrics.set("syncOperations", metrics);

    // Also log to database for persistence
    try {
      desktopDb.logSyncPerformanceMetric(fullMetric);
    } catch (err) {
      console.warn(
        "[EventQueueService] Failed to log performance metric to database:",
        err
      );
    }
  }

  /**
   * Get performance metrics for sync operations
   */
  getPerformanceMetrics(hours: number = 24): PerformanceMetric[] {
    try {
      const cutoffTime = Date.now() - hours * 60 * 1000;
      const metrics = this.performanceMetrics.get("syncOperations") || [];

      return metrics.filter((metric) => metric.timestamp >= cutoffTime);
    } catch (err) {
      console.error("[EventQueueService] Failed to get performance metrics:", err);
      return [];
    }
  }

  /**
   * Get performance statistics for sync operations
   */
  getPerformanceStats(hours: number = 24): PerformanceStats {
    try {
      const metrics = this.getPerformanceMetrics(hours);

      if (metrics.length === 0) {
        return {
          totalOperations: 0,
          successRate: 0,
          averageDurationMs: 0,
          operationsByType: {},
          errorDistribution: {},
        };
      }

      const successfulOps = metrics.filter((m) => m.success);
      const failedOps = metrics.filter((m) => !m.success);

      const stats = {
        totalOperations: metrics.length,
        successRate: (successfulOps.length / metrics.length) * 100,
        averageDurationMs:
          metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length,
        medianDurationMs: this.calculateMedian(metrics.map((m) => m.durationMs)),
        p95DurationMs: this.calculatePercentile(
          metrics.map((m) => m.durationMs),
          95
        ),
        p99DurationMs: this.calculatePercentile(
          metrics.map((m) => m.durationMs),
          99
        ),
        minDurationMs: Math.min(...metrics.map((m) => m.durationMs)),
        maxDurationMs: Math.max(...metrics.map((m) => m.durationMs)),
        operationsByType: {},
        errorDistribution: {},
        throughput: {
          operationsPerMinute: (metrics.length / hours) * 60,
          bytesPerSecond: this.calculateThroughput(metrics, hours),
        },
      };

      // Group by operation type
      const operationsByType = {};
      metrics.forEach((metric) => {
        if (!operationsByType[metric.operation]) {
          operationsByType[metric.operation] = [];
        }
        operationsByType[metric.operation].push(metric);
      });

      // Calculate per-operation-type stats
      Object.entries(operationsByType).forEach(([operation, ops]) => {
        const successful = ops.filter((op) => op.success);
        stats.operationsByType[operation] = {
          count: ops.length,
          successRate: (successful.length / ops.length) * 100,
          avgDuration: ops.reduce((sum, op) => sum + op.durationMs, 0) / ops.length,
        };
      });

      // Calculate error distribution
      failedOps.forEach((op) => {
        const errorKey = op.error || "unknown_error";
        stats.errorDistribution[errorKey] =
          (stats.errorDistribution[errorKey] || 0) + 1;
      });

      return stats;
    } catch (err) {
      console.error(
        "[EventQueueService] Failed to calculate performance stats:",
        err
      );
      return {
        totalOperations: 0,
        successRate: 0,
        averageDurationMs: 0,
        operationsByType: {},
        errorDistribution: {},
      };
    }
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * (sorted.length - 1));
    return sorted[index];
  }

  private calculateThroughput(metrics: PerformanceMetric[], hours: number): number {
    // Estimate throughput based on batch sizes and durations
    const totalBytes = metrics.reduce((sum, m) => {
      const batchSize = m.batchSize || 1;
      // Rough estimate: assume each operation processes ~1KB of data
      return sum + batchSize * 1024;
    }, 0);

    const totalSeconds = hours * 3600;
    return totalBytes / totalSeconds;
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics.set("syncOperations", []);
    try {
      desktopDb.clearSyncPerformanceMetrics();
    } catch (err) {
      console.warn(
        "[EventQueueService] Failed to clear performance metrics from database:",
        err
      );
    }
  }

  /**
   * Export performance metrics
   */
  exportPerformanceMetrics(format = "json", hours = 24) {
    try {
      const metrics = this.getPerformanceMetrics(hours);

      if (format === "csv") {
        return this.convertMetricsToCSV(metrics);
      } else {
        return JSON.stringify(metrics, null, 2);
      }
    } catch (err) {
      console.error("[EventQueueService] Failed to export performance metrics:", err);
      return "";
    }
  }

  convertMetricsToCSV(metrics) {
    if (metrics.length === 0) return "";

    const headers = [
      "timestamp",
      "operation",
      "durationMs",
      "success",
      "batchSize",
      "error",
      "context",
    ];

    const rows = metrics.map((metric) => {
      return [
        new Date(metric.timestamp).toISOString(),
        metric.operation,
        String(metric.durationMs),
        String(metric.success),
        String(metric.batchSize || ""),
        metric.error || "",
        metric.context ? JSON.stringify(metric.context) : "",
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Get or generate device ID for this installation
   */
  getDeviceId() {
    let deviceId = desktopDb.getKeyValue("device_id");
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      desktopDb.setKeyValue("device_id", deviceId);
    }
    return deviceId;
  }

  /**
   * Generate a simple device ID (fallback if uuid is not available)
   */
  generateDeviceId() {
    return (
      "device_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  /**
   * Generate canonical identity key per queue idempotency rules
   * @param {Object} event - Event object with kind, payload, etc.
   * @returns {string|null} - Identity key or null if not applicable
   */
  generateIdentityKey(event) {
    const { kind, payload } = event;

    try {
      switch (kind) {
        case "structures":
          // Base-scoped: ${empireId}:${locationCoord}:${catalogKey}
          if (
            payload.empireId &&
            payload.locationCoord &&
            payload.catalogKey
          ) {
            return `${payload.empireId}:${payload.locationCoord}:${payload.catalogKey}`;
          }
          break;

        case "research":
          // Empire-scoped: ${empireId}:${techCatalogKey}
          if (payload.empireId && payload.techKey) {
            return `${payload.empireId}:${payload.techKey}`;
          }
          break;

        case "units":
          // Base-scoped: ${empireId}:${locationCoord}:${unitCatalogKey}
          if (payload.empireId && payload.locationCoord && payload.unitKey) {
            return `${payload.empireId}:${payload.locationCoord}:${payload.unitKey}`;
          }
          break;

        case "defenses":
          // Base-scoped: ${empireId}:${locationCoord}:${defenseCatalogKey}
          if (
            payload.empireId &&
            payload.locationCoord &&
            payload.defenseKey
          ) {
            return `${payload.empireId}:${payload.locationCoord}:${payload.defenseKey}`;
          }
          break;
      }
    } catch (err) {
      console.warn("[EventQueueService] Failed to generate identity key:", err);
    }

    return null;
  }

  /**
   * Enqueue an event with proper idempotency and indexing
   * @param {string} kind - Event kind ('structures', 'research', 'units', 'defenses')
   * @param {Object} payload - Event payload data
   * @param {Object} options - Additional options
   * @returns {number} - Event ID
   */
  async enqueue(kind, payload, options = {}) {
    const {
      dedupeKey = null,
      identityKey = null,
      catalogKey = null,
      locationCoord = null,
      empireId = null,
    } = options;

    try {
      // Check for existing identical pending event (idempotency)
      if (identityKey) {
        const existingEvents = desktopDb.getEventsByIdentityKey(identityKey);
        const hasPending = existingEvents.some(
          (e) => e.status === "queued" || e.status === "sent"
        );
        if (hasPending) {
          console.log(
            `[EventQueueService] Idempotent skip for identityKey=${identityKey}`
          );
          return existingEvents[0].id;
        }
      }

      const eventId = desktopDb.enqueueEvent(kind, this.deviceId, payload, {
        dedupeKey,
        identityKey,
        catalogKey,
        locationCoord,
        empireId,
      });

      console.log(
        `[EventQueueService] Enqueued ${kind} event ${eventId}${
          identityKey ? ` (identity: ${identityKey})` : ""
        }`
      );

      return eventId;
    } catch (err) {
      console.error("[EventQueueService] Event enqueue failed:", err, {
        kind,
        identityKey,
        catalogKey,
      });
      throw err;
    }
  }

  /**
   * Dequeue events for flush with enhanced filtering and status management
   */
  dequeueEventsForFlush(limit = 50, kind = null) {
    try {
      const events = desktopDb.dequeueEventsForFlush(limit, kind);
      console.log(
        `[EventQueueService] Dequeued ${events.length} events for flush`,
        { limit, kind }
      );
      return events;
    } catch (err) {
      console.error("[EventQueueService] Event dequeue failed:", err, {
        limit,
        kind,
      });
      return [];
    }
  }

  /**
   * Mark event as successfully sent to server
   */
  markEventSent(eventId) {
    try {
      const success = desktopDb.markEventSent(eventId);
      if (success) {
        console.log(`[EventQueueService] Marked event ${eventId} as sent`);
      } else {
        console.warn(
          `[EventQueueService] Failed to mark event ${eventId} as sent`
        );
      }
      return success;
    } catch (err) {
      console.error("[EventQueueService] Mark event sent failed:", err, {
        eventId,
      });
      return false;
    }
  }

  /**
   * Mark event as failed with error tracking
   */
  markEventFailed(eventId, errorMessage) {
    try {
      const success = desktopDb.markEventFailed(eventId, errorMessage);
      if (success) {
        console.log(
          `[EventQueueService] Marked event ${eventId} as failed: ${errorMessage}`
        );
      } else {
        console.warn(
          `[EventQueueService] Failed to mark event ${eventId} as failed`
        );
      }
      return success;
    } catch (err) {
      console.error("[EventQueueService] Mark event failed failed:", err, {
        eventId,
        errorMessage,
      });
      return false;
    }
  }

  /**
   * Mark event as completed/acknowledged by server
   */
  markEventCompleted(eventId) {
    try {
      const success = desktopDb.markEventCompleted(eventId);
      if (success) {
        console.log(`[EventQueueService] Marked event ${eventId} as completed`);
      } else {
        console.warn(
          `[EventQueueService] Failed to mark event ${eventId} as completed`
        );
      }
      return success;
    } catch (err) {
      console.error("[EventQueueService] Mark event completed failed:", err, {
        eventId,
      });
      return false;
    }
  }

  /**
   * Get pending events count by kind
   */
  getPendingEventsCount(kind = null) {
    try {
      const count = desktopDb.getPendingEventsCount(kind);
      return count;
    } catch (err) {
      console.error(
        "[EventQueueService] Get pending events count failed:",
        err,
        { kind }
      );
      return 0;
    }
  }

  /**
   * Get events by identity key for idempotency checks
   */
  getEventsByIdentityKey(identityKey) {
    try {
      const events = desktopDb.getEventsByIdentityKey(identityKey);
      return events;
    } catch (err) {
      console.error(
        "[EventQueueService] Get events by identity key failed:",
        err,
        { identityKey }
      );
      return [];
    }
  }

  /**
   * Delete old sent events for cleanup
   */
  deleteOldSentEvents(olderThanDays = 7) {
    try {
      const deletedRows = desktopDb.deleteOldSentEvents(olderThanDays);
      console.log(
        `[EventQueueService] Cleaned ${deletedRows} old sent events`
      );
      return deletedRows;
    } catch (err) {
      console.error(
        "[EventQueueService] Delete old sent events failed:",
        err,
        { olderThanDays }
      );
      return 0;
    }
  }

  /**
   * Get event statistics for monitoring
   */
  getEventStats() {
    try {
      const stats = desktopDb.getEventStats();
      return stats;
    } catch (err) {
      console.error("[EventQueueService] Get event stats failed:", err);
      return [];
    }
  }

  /**
   * Clear all failed events (for manual cleanup)
   */
  clearFailedEvents() {
    try {
      const clearedCount = desktopDb.clearErrorLogs();
      console.log(
        `[EventQueueService] Cleared ${clearedCount} failed events`
      );
      return clearedCount;
    } catch (err) {
      console.error(
        "[EventQueueService] Failed to clear failed events:",
        err
      );
      return 0;
    }
  }

  /**
   * Clear all error events from the queue (emergency cleanup)
   */
  clearErrorQueue() {
    try {
      const clearedCount = desktopDb.clearEventsByKind('error');
      console.log(
        `[EventQueueService] Cleared ${clearedCount} error events from queue`
      );
      return clearedCount;
    } catch (err) {
      console.error(
        "[EventQueueService] Failed to clear error queue:",
        err
      );
      return 0;
    }
  }

  /**
   * Retry failed events by resetting their status
   */
  retryFailedEvents(maxRetries = 3) {
    try {
      const resetCount = desktopDb.retryFailedEvents(maxRetries);
      console.log(
        `[EventQueueService] Reset ${resetCount} failed events for retry`
      );
      return resetCount;
    } catch (err) {
      console.error(
        "[EventQueueService] Failed to retry failed events:",
        err,
        { maxRetries }
      );
      return 0;
    }
  }

  /**
   * Handle network connectivity changes
   * @param {boolean} isOnline - Current network status
   */
  handleNetworkChange(isOnline) {
    console.log(
      `[EventQueueService] Network status changed: ${isOnline ? "online" : "offline"}`
    );

    if (isOnline) {
      // When coming online, trigger immediate flush
      this.flushPendingEvents().catch((err) => {
        console.error(
          "[EventQueueService] Immediate flush on reconnect failed:",
          err
        );
      });
    }
    // When going offline, events will naturally queue up
  }

  /**
   * Flush pending events to server
   * @param {number} limit - Maximum number of events to flush
   * @returns {Object} - Flush results
   */
  async flushPendingEvents(limit = 50) {
    if (this.isFlushing) {
      console.log("[EventQueueService.flush] Flush already in progress, skipping");
      return { flushed: 0, skipped: true };
    }

    this.isFlushing = true;
    const results = { flushed: 0, failed: 0, completed: 0 };
    const startTime = Date.now();

    try {
      console.log("[EventQueueService.flush] Starting event flush cycle", {
        limit,
      });

      // Snapshot pending counts by kind for diagnostics
      let pendingStats = [];
      try {
        const stats = desktopDb.getEventStats();
        pendingStats = (stats || []).filter(s => s.status === 'queued').map(s => ({ kind: s.kind, count: s.count }));
        console.log('[EventQueueService.flush] Pending by kind before flush', { pendingStats });
      } catch (e) {
        console.warn('[EventQueueService.flush] Failed to get pending stats', e);
      }

      // Dynamically determine which kinds to process (fallback to defaults)
      let eventKinds = [];
      try {
        eventKinds = desktopDb.getDistinctPendingKinds();
      } catch (e) {
        // ignore
      }
      if (!eventKinds || eventKinds.length === 0) {
        eventKinds = ["structures", "research", "units", "defenses"];
      }

      let totalEventsProcessed = 0;
      const kindMetrics = [];

      for (const kind of eventKinds) {
        const kindStartTime = Date.now();
        const pendingEvents = desktopDb.dequeueEventsForFlush(limit, kind);
        if (pendingEvents.length === 0) {
          kindMetrics.push({
            kind,
            count: 0,
            durationMs: Date.now() - kindStartTime,
            success: true,
          });
          continue;
        }

        console.log(
          `[EventQueueService.flush] Processing ${pendingEvents.length} ${kind} events`
        );
        totalEventsProcessed += pendingEvents.length;

        let kindSuccessCount = 0;
        let kindFailedCount = 0;

        for (const event of pendingEvents) {
          try {
            const sendStartTime = Date.now();
            const success = await this.sendEventToServer(event);
            const sendTime = Date.now() - sendStartTime;

            if (success) {
              desktopDb.markEventSent(event.id);
              results.flushed++;
              kindSuccessCount++;
              console.log(
                `[EventQueueService.send] Successfully sent ${kind} event ${event.id}`,
                {
                  eventId: event.id,
                  kind,
                  sendTimeMs: sendTime,
                  identityKey: event.identityKey,
                }
              );
            } else {
              desktopDb.markEventFailed(event.id, "Server rejected event");
              results.failed++;
              kindFailedCount++;
              console.warn(
                `[EventQueueService.send] Failed to send ${kind} event ${event.id}`,
                {
                  eventId: event.id,
                  kind,
                  sendTimeMs: sendTime,
                  identityKey: event.identityKey,
                }
              );
            }
          } catch (err) {
            const errorMsg = err.message || "Unknown error during send";
            desktopDb.markEventFailed(event.id, errorMsg);
            results.failed++;
            kindFailedCount++;
            console.error(
              `[EventQueueService.send] Error sending ${kind} event ${event.id}:`,
              {
                eventId: event.id,
                kind,
                error: errorMsg,
                stack: err.stack,
                identityKey: event.identityKey,
              }
            );
          }
        }

        const kindDuration = Date.now() - kindStartTime;
        kindMetrics.push({
          kind,
          count: pendingEvents.length,
          durationMs: kindDuration,
          success: kindFailedCount === 0,
        });

        // Record performance metrics for each event kind
        try {
          desktopDb.logSyncPerformanceMetric({
            operation: `flush_${kind}`,
            durationMs: kindDuration,
            timestamp: Date.now(),
            success: kindFailedCount === 0,
            batchSize: pendingEvents.length,
            context: {
              kind,
              totalEvents: pendingEvents.length,
              successfulEvents: kindSuccessCount,
              failedEvents: kindFailedCount,
              durationMs: kindDuration,
            },
            process: "main",
          });
        } catch (perfError) {
          console.warn(
            "[EventQueueService] Failed to log kind performance metric:",
            perfError
          );
        }
      }

      // Cleanup old sent events
      const cleanupStartTime = Date.now();
      const cleaned = desktopDb.deleteOldSentEvents(7);
      const cleanupTime = Date.now() - cleanupStartTime;
      console.log(`[EventQueueService.flush] Cleaned ${cleaned} old sent events`, {
        cleanedCount: cleaned,
        cleanupTimeMs: cleanupTime,
      });

      const totalTime = Date.now() - startTime;

      // Compute remaining queued total
      let remainingQueued = 0;
      try {
        remainingQueued = desktopDb.getPendingEventsCount(null);
      } catch (e) {
        // ignore
      }

      console.log(`[EventQueueService.flush] Event flush cycle completed successfully`, {
        totalTimeMs: totalTime,
        totalEventsProcessed,
        results,
        eventKindsProcessed: eventKinds.filter(
          (kind) => desktopDb.dequeueEventsForFlush(1, kind).length > 0
        ),
        remainingQueued,
      });

      // Record overall performance metric for flush cycle
      try {
        desktopDb.logSyncPerformanceMetric({
          operation: "flush_cycle_complete",
          durationMs: totalTime,
          timestamp: Date.now(),
          success: results.failed === 0,
          batchSize: totalEventsProcessed,
          context: {
            totalTimeMs: totalTime,
            totalEventsProcessed,
            successfulEvents: results.flushed,
            failedEvents: results.failed,
            cleanedEvents: cleaned,
            cleanupTimeMs: cleanupTime,
            kindMetrics,
          },
          process: "main",
        });
      } catch (perfError) {
        console.warn(
          "[EventQueueService] Failed to log flush cycle performance metric:",
          perfError
        );
      }
    } catch (err) {
      const totalTime = Date.now() - startTime;
      console.error("[EventQueueService.flush] Flush cycle failed:", {
        error: err.message,
        stack: err.stack,
        totalTimeMs: totalTime,
      });

      // Record performance metric for failed flush cycle
      try {
        desktopDb.logSyncPerformanceMetric({
          operation: "flush_cycle_complete",
          durationMs: totalTime,
          timestamp: Date.now(),
          success: false,
          batchSize: 0,
          error: err.message,
          context: {
            totalTimeMs: totalTime,
            errorType: err.constructor.name,
            errorMessage: err.message,
          },
          process: "main",
        });
      } catch (perfError) {
        console.warn(
          "[EventQueueService] Failed to log failed flush cycle performance metric:",
          perfError
        );
      }
    } finally {
      this.isFlushing = false;
    }

    return results;
  }

  /**
   * Send individual event to server
   * @param {Object} event - Event to send
   * @returns {boolean} - Success status
   */
  async sendEventToServer(event) {
    // This would integrate with the main server API
    // For now, simulate successful send
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate 90% success rate
      return Math.random() > 0.1;
    } catch (err) {
      console.error("[EventQueueService] Server send failed:", err);
      return false;
    }
  }

  /**
   * Start periodic flush interval
   * @param {number} intervalMs - Flush interval in milliseconds (default: 30 seconds)
   */
  startFlushInterval(intervalMs = 30000) {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flushPendingEvents().catch((err) => {
        console.error("[EventQueueService] Periodic flush failed:", err);
      });
    }, intervalMs);

    console.log(
      `[EventQueueService] Started flush interval (${intervalMs}ms)`
    );
  }

  /**
   * Stop periodic flush interval
   */
  stopFlushInterval() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      console.log("[EventQueueService] Stopped flush interval");
    }
  }

  /**
   * Shutdown service gracefully
   */
  async shutdown() {
    console.log("[EventQueueService] Shutting down...");
    this.stopFlushInterval();

    // Final flush attempt
    try {
      await this.flushPendingEvents(100);
    } catch (err) {
      console.error("[EventQueueService] Final flush failed:", err);
    }
  }
}

// Export singleton instance
export default new EventQueueService();
