/**
 * Client Error Logging Redaction Tests
 * Verifies that nested sensitive fields are redacted in both console output and localStorage persistence.
 */

import clientErrorLogger from '../errorLoggingService';

describe('Client Error Logging - Redaction', () => {
  const LS_KEY = 'attrition_client_errors';

  let originalConsoleError: any;
  let originalConsoleWarn: any;
  let originalConsoleInfo: any;
  let originalConsoleDebug: any;

  let captured: Array<{ level: string; msg: string }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    captured = [];

    // Ensure clean localStorage
    localStorage.removeItem(LS_KEY);

    // Capture console output
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleInfo = console.info;
    originalConsoleDebug = console.debug;

    const capture =
      (level: string) =>
      (...args: any[]) => {
        const msg = args
          .map((a) => (typeof a === 'string' ? a : safeStringify(a)))
          .join(' ');
        captured.push({ level, msg });
      };

    console.error = capture('error');
    console.warn = capture('warn');
    console.info = capture('info');
    console.debug = capture('debug');
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;
    localStorage.removeItem(LS_KEY);
  });

  test('redacts nested sensitive fields in console output and localStorage', () => {
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

    const id = clientErrorLogger.error('Testing redaction', null, context);
    expect(typeof id).toBe('string');

    // Console output should contain redacted values and not leak secrets
    const joined = captured.map((c) => c.msg).join('\n');
    expect(joined).toContain('***REDACTED***');
    expect(joined).not.toContain('SECRET_TOKEN');
    expect(joined).not.toContain('access-abc');
    expect(joined).not.toContain('refresh-xyz');
    expect(joined).not.toContain('nested-token');
    expect(joined).not.toContain('CAPS-HEADER');

    // LocalStorage payload should be redacted
    const raw = localStorage.getItem(LS_KEY);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw || '[]');
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBeGreaterThan(0);
    const entry = stored[stored.length - 1];

    expect(entry).toBeTruthy();
    expect(entry.context).toBeTruthy();

    expect(entry.context.headers.authorization).toBe('***REDACTED***');
    expect(entry.context.payload.token).toBe('***REDACTED***');
    expect(entry.context.payload.meta.refreshToken).toBe('***REDACTED***');
    expect(entry.context.mixed[0].token).toBe('***REDACTED***');
    expect(entry.context.mixed[1].Authorization).toBe('***REDACTED***');

    // Benign value should remain intact
    expect(entry.context.benign.note).toBe('safe-value');
  });

  test('does not alter non-sensitive keys and preserves structure', () => {
    const context = {
      info: { message: 'hello', count: 2 },
      list: [1, 2, 3],
      nested: { inside: { allowed: true } }
    };

    clientErrorLogger.warn('Non-sensitive context', null, context);

    const raw = localStorage.getItem(LS_KEY);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw || '[]');
    const entry = stored[stored.length - 1];

    const redactedCtx = entry.context;
    expect(redactedCtx.info).toEqual({ message: 'hello', count: 2 });
    expect(redactedCtx.list).toEqual([1, 2, 3]);
    expect(redactedCtx.nested).toEqual({ inside: { allowed: true } });
  });
});

function safeStringify(val: any) {
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}
