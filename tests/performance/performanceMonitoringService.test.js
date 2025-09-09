/**
 * Unit tests for Performance Monitoring Service
 * - Aggregations (avg/median/p95/p99/min/max)
 * - Per-op breakdown and error distribution
 * - Throughput computation
 * - Threshold persistence and breach detection
 */

const now = Date.now();

// Mock desktop DB used by the service
const mockDesktopDb = {
  getRecentSyncPerformanceMetrics: jest.fn(),
  clearSyncPerformanceMetrics: jest.fn(),
  getKeyValue: jest.fn(),
  setKeyValue: jest.fn()
};

// Mock ../db.js BEFORE importing the service
jest.mock('../db.js', () => mockDesktopDb, { virtual: true });

describe('performanceMonitoringService', () => {
  let svc;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    // Dynamically import to ensure our mock is in place
    const mod = await import('../services/performanceMonitoringService.js');
    svc = mod.default;
  });

  function seedMetrics() {
    // 5 metrics across different operations, varied success and durations
    const metrics = [
      {
        id: 'm1',
        operation: 'flush_structures',
        durationMs: 10,
        timestamp: now - 10_000,
        success: true,
        batchSize: 5,
        error: undefined,
        context: { kind: 'structures' },
        process: 'main'
      },
      {
        id: 'm2',
        operation: 'flush_research',
        durationMs: 20,
        timestamp: now - 9_000,
        success: true,
        batchSize: 3,
        error: undefined,
        context: { kind: 'research' },
        process: 'main'
      },
      {
        id: 'm3',
        operation: 'flush_units',
        durationMs: 30,
        timestamp: now - 8_000,
        success: false,
        batchSize: 2,
        error: 'HTTP 500',
        context: { kind: 'units' },
        process: 'main'
      },
      {
        id: 'm4',
        operation: 'flush_defenses',
        durationMs: 1000,
        timestamp: now - 7_000,
        success: true,
        batchSize: 11,
        error: undefined,
        context: { kind: 'defenses' },
        process: 'main'
      },
      {
        id: 'm5',
        operation: 'flush_cycle_complete',
        durationMs: 40,
        timestamp: now - 6_000,
        success: false,
        batchSize: 1,
        error: 'timeout',
        context: { totalEventsProcessed: 21 },
        process: 'main'
      }
    ];
    mockDesktopDb.getRecentSyncPerformanceMetrics.mockReturnValue(metrics);
    return metrics;
  }

  test('getMetrics returns normalized metrics for the window', () => {
    const m = seedMetrics();
    const out = svc.getMetrics(1); // 1 hour
    expect(out).toHaveLength(m.length);
    // Spot check a couple of fields
    expect(out[0].operation).toBe('flush_structures');
    expect(typeof out[0].durationMs).toBe('number');
    expect(typeof out[0].timestamp).toBe('number');
    expect(out[2].success).toBe(false);
    expect(out[2].error).toBe('HTTP 500');
  });

  test('getStats computes aggregations, per-op breakdown, errors, throughput', () => {
    seedMetrics();
    const hours = 1;
    const stats = svc.getStats(hours);

    // Totals and averages
    expect(stats.totalOperations).toBe(5);
    // success: m1, m2, m4 = 3/5 = 60%
    expect(stats.successRate).toBeCloseTo(60);

    // durations: [10,20,30,40,1000] (unsorted -> sorted inside)
    // average = 1100 / 5 = 220
    expect(stats.averageDurationMs).toBeCloseTo(220);

    // median of sorted [10,20,30,40,1000] = 30
    expect(stats.medianDurationMs).toBe(30);

    // percentile calc uses floor((p/100)*(n-1)):
    // p95 idx = floor(0.95*4) = 3 -> value 40
    expect(stats.p95DurationMs).toBe(40);
    // p99 idx = floor(0.99*4) = 3 -> value 40
    expect(stats.p99DurationMs).toBe(40);

    expect(stats.minDurationMs).toBe(10);
    expect(stats.maxDurationMs).toBe(1000);

    // Per-operation breakdown basics
    expect(stats.operationsByType.flush_structures.count).toBe(1);
    expect(stats.operationsByType.flush_structures.successRate).toBeCloseTo(100);
    expect(stats.operationsByType.flush_research.count).toBe(1);
    expect(stats.operationsByType.flush_units.count).toBe(1);
    expect(stats.operationsByType.flush_units.successRate).toBeCloseTo(0);
    expect(stats.operationsByType.flush_defenses.count).toBe(1);
    expect(stats.operationsByType.flush_cycle_complete.count).toBe(1);

    // Error distribution from failed items only
    expect(stats.errorDistribution['HTTP 500']).toBe(1);
    expect(stats.errorDistribution['timeout']).toBe(1);

    // Throughput bytes/second: sum(batch)*1024 / (hours*3600)
    // batches: 5+3+2+11+1 = 22 -> 22*1024 / 3600
    const expectedBps = (22 * 1024) / (hours * 3600);
    expect(stats.throughput.bytesPerSecond).toBeCloseTo(expectedBps, 6);
    // operationsPerMinute: 5 ops per hour -> 5/1 * 60 = 300
    expect(stats.throughput.operationsPerMinute).toBeCloseTo(300);
  });

  test('export returns JSON or CSV by format', () => {
    seedMetrics();
    const json = svc.export('json', 1);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].operation).toBeDefined();

    const csv = svc.export('csv', 1);
    expect(typeof csv).toBe('string');
    expect(csv.startsWith('timestamp,operation,durationMs,success,batchSize,error,context')).toBe(true);
    expect(csv.split('\n').length).toBeGreaterThan(1);
  });

  test('clear delegates to DB and returns deleted count', () => {
    mockDesktopDb.clearSyncPerformanceMetrics.mockReturnValue(7);
    const deleted = svc.clear();
    expect(deleted).toBe(7);
    expect(mockDesktopDb.clearSyncPerformanceMetrics).toHaveBeenCalledWith(0);
  });

  test('thresholds: set/get sanitize and persist via kv_store', () => {
    // get: nothing stored
    mockDesktopDb.getKeyValue.mockReturnValueOnce(null);
    expect(svc.getThresholds()).toEqual([]);

    // set: sanitize invalid numbers
    mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
    const ok = svc.setThresholds([
      { op: 'flush_units', p95Ms: -5, failRatePct: 120 }, // invalid values should be undefined
      { op: undefined, p95Ms: 50, failRatePct: 10 }       // valid
    ]);
    expect(ok).toBe(true);
    expect(mockDesktopDb.setKeyValue).toHaveBeenCalledTimes(1);
    const [, payload] = mockDesktopDb.setKeyValue.mock.calls[0];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[0]).toEqual({ op: 'flush_units', p95Ms: undefined, failRatePct: undefined });
    expect(payload[1]).toEqual({ op: undefined, p95Ms: 50, failRatePct: 10 });

    // get: return stored thresholds
    mockDesktopDb.getKeyValue.mockReturnValueOnce([{ op: undefined, p95Ms: 50, failRatePct: 10 }]);
    expect(svc.getThresholds()).toEqual([{ op: undefined, p95Ms: 50, failRatePct: 10 }]);
  });

  test('getThresholdBreaches detects global and per-op breaches', () => {
    seedMetrics();
    // Stored thresholds (KV)
    mockDesktopDb.getKeyValue
      .mockReturnValueOnce([
        // Global p95 threshold 30 -> p95=40 breaches
        { op: undefined, p95Ms: 30, failRatePct: 10 },
        // Per-op: defenses p95 threshold 500 -> op p95=1000 breaches
        { op: 'flush_defenses', p95Ms: 500 }
      ]);

    const breaches = svc.getThresholdBreaches(1);
    // Expect at least 3 breaches:
    // - global p95Ms (40 > 30)
    // - global failRatePct (fail=40% > 10%)
    // - per-op defenses p95Ms (1000 > 500)
    expect(breaches.length).toBeGreaterThanOrEqual(3);

    const kinds = breaches.map(b => `${b.op || 'GLOBAL'}:${b.metric}`);
    expect(kinds).toContain('GLOBAL:p95Ms');
    expect(kinds).toContain('GLOBAL:failRatePct');
    expect(kinds).toContain('flush_defenses:p95Ms');

    for (const b of breaches) {
      expect(b.windowHours).toBe(1);
      expect(typeof b.ts).toBe('number');
      expect(typeof b.value).toBe('number');
      expect(typeof b.threshold).toBe('number');
    }
  });
});
