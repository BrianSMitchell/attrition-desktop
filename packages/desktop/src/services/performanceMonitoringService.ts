import desktopDb from '../db.js';

class PerformanceMonitoringService {
  static KV_THRESHOLDS_KEY = 'perf_thresholds';

  getMetrics(hours = 24): any[] {
    try {
      const rows = desktopDb.getRecentSyncPerformanceMetrics?.(hours) || [];
      const metrics = rows.map((row: any) => {
        const duration = row.durationMs ?? row.duration_ms;
        const batch = row.batchSize ?? row.batch_size;
        const err = row.error ?? row.error_message;
        const ts = typeof row.timestamp === 'number'
          ? row.timestamp
          : new Date(row.timestamp).getTime();

        return {
          operation: row.operation,
          durationMs: typeof duration === 'number' ? duration : Number(duration ?? 0),
          timestamp: ts,
          success: typeof row.success === 'boolean' ? row.success : row.success === 1,
          batchSize: batch == null ? undefined : Number(batch),
          error: err == null ? undefined : String(err),
          context: row.context
        };
      });
      return metrics;
    } catch (err) {
      console.error('[PerformanceMonitoringService] Failed to get metrics:', err);
      return [];
    }
  }

  getStats(hours = 24): any {
    try {
      const metrics = this.getMetrics(hours);
      if (metrics.length === 0) {
        return this.emptyStats();
      }

      const durations = metrics.map((m) => m.durationMs);
      const successful = metrics.filter((m) => m.success);
      const failed = metrics.filter((m) => !m.success);

      const stats = {
        totalOperations: metrics.length,
        successRate: (successful.length / metrics.length) * 100,
        averageDurationMs: durations.reduce((s, v) => s + v, 0) / durations.length,
        medianDurationMs: this.calculateMedian(durations),
        p95DurationMs: this.calculatePercentile(durations, 95),
        p99DurationMs: this.calculatePercentile(durations, 99),
        minDurationMs: Math.min(...durations),
        maxDurationMs: Math.max(...durations),
        operationsByType: {},
        errorDistribution: {},
        throughput: {
          operationsPerMinute: (metrics.length / hours) * 60,
          bytesPerSecond: this.calculateThroughput(metrics, hours),
        },
      };

      const byOp: Record<string, any[]> = {};
      for (const m of metrics) {
        (byOp[m.operation] ||= []).push(m);
      }

      for (const [op, arr] of Object.entries(byOp)) {
        const opDurations = arr.map((m: any) => m.durationMs);
        const opSuccess = arr.filter((m: any) => m.success);
        (stats.operationsByType as Record<string, any>)[op] = {
          count: arr.length,
          successRate: (opSuccess.length / arr.length) * 100,
          avgDuration: opDurations.reduce((s, v) => s + v, 0) / opDurations.length,
          medianDurationMs: this.calculateMedian(opDurations),
          p95DurationMs: this.calculatePercentile(opDurations, 95),
          p99DurationMs: this.calculatePercentile(opDurations, 99),
        };
      }

      for (const f of failed) {
        const key = f.error || 'unknown_error';
        (stats.errorDistribution as Record<string, number>)[key] = ((stats.errorDistribution as Record<string, number>)[key] || 0) + 1;
      }

      return stats;
    } catch (err) {
      console.error('[PerformanceMonitoringService] Failed to compute stats:', err);
      return this.emptyStats();
    }
  }

  export(format = 'json', hours = 24): string {
    try {
      const metrics = this.getMetrics(hours);
      if (format === 'csv') {
        return this.convertMetricsToCSV(metrics);
      }
      return JSON.stringify(metrics, null, 2);
    } catch (err) {
      console.error('[PerformanceMonitoringService] Failed to export metrics:', err);
      return '';
    }
  }

  clear(): number {
    try {
      const deleted = desktopDb.clearSyncPerformanceMetrics?.(0) ?? 0;
      return deleted;
    } catch (err) {
      console.error('[PerformanceMonitoringService] Failed to clear metrics:', err);
      return 0;
    }
  }

  getThresholds(): any[] {
    try {
      const stored = desktopDb.getKeyValue?.(PerformanceMonitoringService.KV_THRESHOLDS_KEY);
      if (Array.isArray(stored)) return stored;
      return [];
    } catch (err) {
      console.error('[PerformanceMonitoringService] Failed to get thresholds:', err);
      return [];
    }
  }

  setThresholds(thresholds: any[]): boolean {
    try {
      const sanitized = (thresholds || []).map((t: any) => ({
        op: t.op,
        p95Ms: typeof t.p95Ms === 'number' && t.p95Ms >= 0 ? t.p95Ms : undefined,
        failRatePct: typeof t.failRatePct === 'number' && t.failRatePct >= 0 && t.failRatePct <= 100 ? t.failRatePct : undefined,
      }));
      const ok = desktopDb.setKeyValue?.(PerformanceMonitoringService.KV_THRESHOLDS_KEY, sanitized);
      return !!ok;
    } catch (err) {
      console.error('[PerformanceMonitoringService] Failed to set thresholds:', err);
      return false;
    }
  }

  getThresholdBreaches(hours = 1): any[] {
    const breaches: any[] = [];
    const thresholds = this.getThresholds();
    if (thresholds.length === 0) return breaches;

    const now = Date.now();
    const stats = this.getStats(hours);

    for (const t of thresholds) {
      if (!t.op) {
        if (typeof t.p95Ms === 'number' && stats.p95DurationMs > t.p95Ms) {
          breaches.push({
            op: undefined,
            metric: 'p95Ms',
            value: stats.p95DurationMs,
            threshold: t.p95Ms,
            windowHours: hours,
            ts: now,
          });
        }
        if (typeof t.failRatePct === 'number') {
          const fail = 100 - stats.successRate;
          if (fail > t.failRatePct) {
            breaches.push({
              op: undefined,
              metric: 'failRatePct',
              value: fail,
              threshold: t.failRatePct,
              windowHours: hours,
              ts: now,
            });
          }
        }
      } else {
        const opStats = (stats.operationsByType as Record<string, any>)[t.op];
        if (opStats) {
          if (typeof t.p95Ms === 'number' && opStats.p95DurationMs > t.p95Ms) {
            breaches.push({
              op: t.op,
              metric: 'p95Ms',
              value: opStats.p95DurationMs,
              threshold: t.p95Ms,
              windowHours: hours,
              ts: now,
            });
          }
          if (typeof t.failRatePct === 'number') {
            const fail = 100 - opStats.successRate;
            if (fail > t.failRatePct) {
              breaches.push({
                op: t.op,
                metric: 'failRatePct',
                value: fail,
                threshold: t.failRatePct,
                windowHours: hours,
                ts: now,
              });
            }
          }
        }
      }
    }

    return breaches;
  }

  // Helpers

  emptyStats(): any {
    return {
      totalOperations: 0,
      successRate: 0,
      averageDurationMs: 0,
      medianDurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      operationsByType: {},
      errorDistribution: {},
      throughput: {
        operationsPerMinute: 0,
        bytesPerSecond: 0,
      },
    };
  }

  calculateMedian(values: number[]): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return (sorted.length % 2 === 0)
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  calculatePercentile(values: number[], percentile: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor((percentile / 100) * (sorted.length - 1));
    return sorted[idx];
  }

  calculateThroughput(metrics: any[], hours: number): number {
    const totalBytes = metrics.reduce((sum, m) => {
      const batch = m.batchSize || 1;
      return sum + (batch * 1024);
    }, 0);
    const totalSeconds = hours * 3600;
    return totalBytes / totalSeconds;
  }

  convertMetricsToCSV(metrics: any[]): string {
    if (!metrics.length) return '';

    const headers = [
      'timestamp', 'operation', 'durationMs', 'success', 'batchSize', 'error', 'context'
    ];

    const rows = metrics.map((m) => [
      new Date(m.timestamp).toISOString(),
      m.operation,
      String(m.durationMs),
      String(m.success),
      String(m.batchSize ?? ''),
      m.error ?? '',
      m.context ? JSON.stringify(m.context) : ''
    ].map((field) => {
      const s = String(field);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}

const performanceMonitoringService = new PerformanceMonitoringService();
export default performanceMonitoringService;
