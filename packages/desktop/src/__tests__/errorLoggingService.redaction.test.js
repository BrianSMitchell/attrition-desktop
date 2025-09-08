const path = require('path');

// Mock electron app.getPath before importing the logger
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data');
    }
    return '';
  }
};

jest.mock('electron', () => ({
  app: mockApp
}));

// Mock desktop DB to capture stored context
const mockDesktopDb = {
  initialized: true,
  setKeyValue: jest.fn(),
  enqueueEvent: jest.fn()
};
jest.mock('../db.js', () => mockDesktopDb);

// Mock fs to avoid real disk writes/rotation during tests
const realFs = jest.requireActual('node:fs');
jest.mock('node:fs', () => ({
  ...realFs,
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  statSync: jest.fn(() => ({ size: 0 })), // keep under rotation threshold
  unlinkSync: jest.fn(),
  renameSync: jest.fn()
}));

describe('Desktop Error Logging - Redaction', () => {
  let errorLogger;
  let originalConsoleError;
  let originalConsoleWarn;
  let originalConsoleInfo;
  let originalConsoleDebug;
  let captured = [];

  beforeEach(() => {
    jest.clearAllMocks();
    captured = [];

    // Capture all console outputs
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleInfo = console.info;
    originalConsoleDebug = console.debug;

    const capture = (level) => (...args) => {
      const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      captured.push({ level, msg });
      // Also forward to original for visibility in test output if needed
      // originalConsole[level](...args);
    };

    console.error = capture('error');
    console.warn = capture('warn');
    console.info = capture('info');
    console.debug = capture('debug');

    // Import the logger after mocks
    jest.isolateModules(() => {
      errorLogger = require('../services/errorLoggingService.js').default;
    });
  });

  afterEach(() => {
    // Restore console
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;
  });

  test('redacts nested sensitive fields in console output and stored event context', () => {
    const context = {
      headers: { authorization: 'Bearer SECRET_TOKEN' },
      payload: {
        token: 'access-abc',
        meta: {
          refreshToken: 'refresh-xyz'
        }
      },
      mixed: [
        { token: 'nested-token' },
        { Authorization: 'CAPS-HEADER' } // case-insensitive key match
      ],
      benign: { note: 'safe-value' }
    };

    // Perform a structured log
    const id = errorLogger.error('Testing redaction', null, context);

    expect(typeof id).toBe('string');

    // Console output should contain redacted values and not leak secrets
    const joined = captured.map((c) => c.msg).join('\n');
    expect(joined).toContain('***REDACTED***');
    expect(joined).not.toContain('SECRET_TOKEN');
    expect(joined).not.toContain('access-abc');
    expect(joined).not.toContain('refresh-xyz');
    expect(joined).not.toContain('nested-token');
    expect(joined).not.toContain('CAPS-HEADER');

    // Desktop DB enqueueEvent should receive redacted context
    expect(mockDesktopDb.enqueueEvent).toHaveBeenCalledTimes(1);
    const eventPayload = mockDesktopDb.enqueueEvent.mock.calls[0][2]; // third arg is payload
    expect(eventPayload).toBeTruthy();
    expect(eventPayload.context).toBeTruthy();

    // Headers
    expect(eventPayload.context.headers.authorization).toBe('***REDACTED***');
    // Payload tokens
    expect(eventPayload.context.payload.token).toBe('***REDACTED***');
    expect(eventPayload.context.payload.meta.refreshToken).toBe('***REDACTED***');
    // Mixed array
    expect(eventPayload.context.mixed[0].token).toBe('***REDACTED***');
    expect(eventPayload.context.mixed[1].Authorization).toBe('***REDACTED***');
    // Benign value should remain intact
    expect(eventPayload.context.benign.note).toBe('safe-value');
  });

  test('does not alter non-sensitive keys and preserves structure', () => {
    const context = {
      info: { message: 'hello', count: 2 },
      list: [1, 2, 3],
      nested: { inside: { allowed: true } }
    };

    errorLogger.warn('Non-sensitive context', null, context);

    // DB path should reflect identical structure/values for non-sensitive fields
    expect(mockDesktopDb.enqueueEvent).toHaveBeenCalledTimes(1);
    const eventPayload = mockDesktopDb.enqueueEvent.mock.calls[0][2];
    const redactedCtx = eventPayload.context;

    expect(redactedCtx.info).toEqual({ message: 'hello', count: 2 });
    expect(redactedCtx.list).toEqual([1, 2, 3]);
    expect(redactedCtx.nested).toEqual({ inside: { allowed: true } });
  });
});
