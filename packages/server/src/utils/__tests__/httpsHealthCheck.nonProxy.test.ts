import express from 'express';
import request from 'supertest';
import { ENV_VARS } from '@shared/constants/env-vars';

import { HTTP_STATUS } from '@shared/response-formats';
import { ENV_VARS } from '../../../shared/src/constants/env-vars';

/**
 * Validates that in non-proxy mode, the handler calls performHttpsHealthCheck.
 */
describe('/api/https-health non-proxy mode calls performHttpsHealthCheck', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env[ENV_VARS.USE_REVERSE_PROXY_SSL];
    delete process.env.RENDER;
    process.env[ENV_VARS.HTTPS_PORT] = '443';
    process.env[ENV_VARS.PORT] = '3001';
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  test('performHttpsHealthCheck is invoked and response uses its result', async () => {
    const fakeResult = {
      healthy: true,
      timestamp: new Date().toISOString(),
      checks: {
        httpsListening: true,
        httpRedirects: true,
        certificateValid: true,
        securityHeaders: true
      },
      certificate: undefined
    } as any;

    // Mock the module before requiring it
    jest.isolateModules(() => {
      const real = jest.requireActual('../httpsHealthCheck');
      jest.doMock('../httpsHealthCheck', () => ({
        __esModule: true,
        ...real,
        performHttpsHealthCheck: jest.fn().mockResolvedValue(fakeResult),
      }));

      const mod = require('../httpsHealthCheck');

      const app = express();
      app.get('/api/https-health', mod.httpsHealthCheckHandler);

      return request(app).get('/api/https-health').then((res) => {
        expect(mod.performHttpsHealthCheck).toHaveBeenCalled();
        expect(res.status).toBe(HTTP_STATUS.OK);
        expect(res.body).toHaveProperty('success', true);
      });
    });
  });
});

