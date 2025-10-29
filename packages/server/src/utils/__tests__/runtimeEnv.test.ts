import { isReverseProxySSL } from '../runtimeEnv';
import { ENV_VARS } from '@game/shared';

describe('isReverseProxySSL', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env[ENV_VARS.USE_REVERSE_PROXY_SSL];
    delete process.env.RENDER;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test('returns false by default when flags are not set', () => {
    expect(isReverseProxySSL()).toBe(false);
  });

  test('returns true when USE_REVERSE_PROXY_SSL is true (any casing)', () => {
    process.env[ENV_VARS.USE_REVERSE_PROXY_SSL] = 'true';
    expect(isReverseProxySSL()).toBe(true);

    process.env[ENV_VARS.USE_REVERSE_PROXY_SSL] = 'True';
    expect(isReverseProxySSL()).toBe(true);

    process.env[ENV_VARS.USE_REVERSE_PROXY_SSL] = 'YES';
    expect(isReverseProxySSL()).toBe(true);
  });

  test('returns true when RENDER is true', () => {
    process.env.RENDER = 'true';
    expect(isReverseProxySSL()).toBe(true);
  });

  test('returns true when either flag is true', () => {
    process.env.RENDER = 'true';
    process.env[ENV_VARS.USE_REVERSE_PROXY_SSL] = 'false';
    expect(isReverseProxySSL()).toBe(true);
  });
});