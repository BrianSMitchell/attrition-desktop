/**
 * IPC integration tests for Performance Monitoring endpoints
 * Verifies roundtrip renderer -> main IPC -> service -> db and back (via mocked service)
 */

const path = require('path');
const fs = require('fs');

// Mock electron ipcMain to capture handlers
const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

const mockApp = {
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  isPackaged: false,
  setAppUserModelId: jest.fn(),
  getPath: (name) => {
    if (name === 'userData') return path.join(__dirname, 'test-data-perf');
    return '';
  }
};

const mockShell = {
  openExternal: jest.fn().mockResolvedValue(true),
  openPath: jest.fn().mockResolvedValue('')
};

const mockBrowserWindow = {
  getAllWindows: jest.fn().mockReturnValue([]),
  fromWebContents: jest.fn().mockReturnValue({
    show: jest.fn(),
    hide: jest.fn(),
    destroy: jest.fn()
  })
};

// Mock electron
jest.mock('electron', () => ({
  app: mockApp,
  shell: mockShell,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain
}));

// Mock desktop DB (not directly used by perf IPC but main.js loads db.js)
const mockDesktopDb = {
  init: jest.fn(),
  close: jest.fn()
};
jest.mock('../db.js', () => mockDesktopDb);

// Mock performanceMonitoringService used by main IPC handlers
const mockPerfSvc = {
  getMetrics: jest.fn(),
  getStats: jest.fn(),
  export: jest.fn(),
  clear: jest.fn(),
  getThresholds: jest.fn(),
  setThresholds: jest.fn(),
  getThresholdBreaches: jest.fn()
};
jest.mock('../services/performanceMonitoringService.js', () => mockPerfSvc);

// Ensure filesystem test dir exists
const testDataDir = path.join(__dirname, 'test-data-perf');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

describe('Performance Monitoring IPC Handlers', () => {
  let ipcHandlers = {};
  let mainModule;

  const registerIpcHandler = (channel, handler) => {
    ipcHandlers[channel] = handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ipcHandlers = {};

    mockIpcMain.handle.mockImplementation((channel, handler) => {
      registerIpcHandler(channel, handler);
    });

    jest.isolateModules(() => {
      mainModule = require('../main.js');
    });
  });

  afterEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  test('perf:getMetrics forwards window hours and returns data', async () => {
    const handler = ipcHandlers['perf:getMetrics'];
    expect(handler).toBeDefined();

    const sample = [{ operation: 'flush_structures', durationMs: 10, timestamp: Date.now(), success: true }];
    mockPerfSvc.getMetrics.mockReturnValueOnce(sample);

    const res = await handler(null, 6);
    expect(res).toEqual({ success: true, data: sample });
    expect(mockPerfSvc.getMetrics).toHaveBeenCalledWith(6);
  });

  test('perf:getMetrics defaults invalid hours to 24', async () => {
    const handler = ipcHandlers['perf:getMetrics'];
    mockPerfSvc.getMetrics.mockReturnValueOnce([]);
    const res = await handler(null, 'abc');
    expect(res.success).toBe(true);
    expect(mockPerfSvc.getMetrics).toHaveBeenCalledWith(24);
  });

  test('perf:getStats forwards window hours and returns stats', async () => {
    const handler = ipcHandlers['perf:getStats'];
    const stats = {
      totalOperations: 3,
      successRate: 66.7,
      averageDurationMs: 100,
      medianDurationMs: 50,
      p95DurationMs: 200,
      p99DurationMs: 400,
      minDurationMs: 10,
      maxDurationMs: 500,
      operationsByType: { flush_structures: { count: 1, successRate: 100, avgDuration: 10 } },
      errorDistribution: {},
      throughput: { operationsPerMinute: 3, bytesPerSecond: 42 }
    };
    mockPerfSvc.getStats.mockReturnValueOnce(stats);

    const res = await handler(null, 12);
    expect(res).toEqual({ success: true, stats });
    expect(mockPerfSvc.getStats).toHaveBeenCalledWith(12);
  });

  test('perf:export respects format and hours', async () => {
    const handler = ipcHandlers['perf:export'];

    mockPerfSvc.export.mockReturnValueOnce('csv,content');
    const csv = await handler(null, 'csv', 24);
    expect(csv).toEqual({ success: true, data: 'csv,content', format: 'csv' });
    expect(mockPerfSvc.export).toHaveBeenCalledWith('csv', 24);

    mockPerfSvc.export.mockClear();
    mockPerfSvc.export.mockReturnValueOnce('[]');
    const json = await handler(null, 'unknown', 'NaN');
    // invalid format & hours should default to json/24
    expect(json).toEqual({ success: true, data: '[]', format: 'json' });
    expect(mockPerfSvc.export).toHaveBeenCalledWith('json', 24);
  });

  test('perf:clear returns deleted count', async () => {
    const handler = ipcHandlers['perf:clear'];
    mockPerfSvc.clear.mockReturnValueOnce(9);

    const res = await handler();
    expect(res).toEqual({ success: true, deleted: 9 });
    expect(mockPerfSvc.clear).toHaveBeenCalled();
  });

  test('perf:getThresholds returns persisted thresholds', async () => {
    const handler = ipcHandlers['perf:getThresholds'];
    const thresholds = [{ op: 'flush_units', p95Ms: 100, failRatePct: 5 }];
    mockPerfSvc.getThresholds.mockReturnValueOnce(thresholds);

    const res = await handler();
    expect(res).toEqual({ success: true, thresholds });
    expect(mockPerfSvc.getThresholds).toHaveBeenCalled();
  });

  test('perf:setThresholds persists thresholds and returns success', async () => {
    const handler = ipcHandlers['perf:setThresholds'];
    mockPerfSvc.setThresholds.mockReturnValueOnce(true);

    const input = [{ op: undefined, p95Ms: 50, failRatePct: 10 }];
    const res = await handler(null, input);
    expect(res).toEqual({ success: true });
    expect(mockPerfSvc.setThresholds).toHaveBeenCalledWith(input);
  });

  test('perf:getThresholdBreaches forwards window hours and returns breaches', async () => {
    const handler = ipcHandlers['perf:getThresholdBreaches'];
    const breaches = [
      { op: undefined, metric: 'p95Ms', value: 120, threshold: 100, windowHours: 1, ts: Date.now() }
    ];
    mockPerfSvc.getThresholdBreaches.mockReturnValueOnce(breaches);

    const res = await handler(null, 2);
    expect(res).toEqual({ success: true, breaches });
    expect(mockPerfSvc.getThresholdBreaches).toHaveBeenCalledWith(2);
  });

  test('perf:getThresholdBreaches defaults invalid hours to 1', async () => {
    const handler = ipcHandlers['perf:getThresholdBreaches'];
    mockPerfSvc.getThresholdBreaches.mockReturnValueOnce([]);

    const res = await handler(null, 'bad');
    expect(res.success).toBe(true);
    expect(mockPerfSvc.getThresholdBreaches).toHaveBeenCalledWith(1);
  });
});
