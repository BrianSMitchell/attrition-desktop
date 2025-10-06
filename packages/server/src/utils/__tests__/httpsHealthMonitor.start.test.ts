import { shouldStartHttpsHealthMonitor } from '../httpsHealthCheck';

describe('shouldStartHttpsHealthMonitor', () => {
  test('returns false in reverse proxy mode', () => {
    expect(shouldStartHttpsHealthMonitor(true)).toBe(false);
  });

  test('returns true in non-proxy mode', () => {
    expect(shouldStartHttpsHealthMonitor(false)).toBe(true);
  });
});