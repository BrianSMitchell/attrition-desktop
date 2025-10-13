import express from 'express';
import request from 'supertest';
import { httpsHealthCheckHandler } from '../httpsHealthCheck';
import { ENV_VARS } from '@shared/constants/env-vars';

import { HTTP_STATUS } from '@shared/response-formats';
import { ENV_VARS } from '../../../shared/src/constants/env-vars';

/**
 * Validates that /api/https-health short-circuits in reverse proxy mode.
 */
describe('/api/https-health reverse proxy mode', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env[ENV_VARS.USE_REVERSE_PROXY_SSL] = 'true';
    delete process.env[ENV_VARS.HTTPS_PORT]; // ensure it doesn't try local 443 logic
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test('returns 200 with reverse proxy message and success=true', async () => {
    const app = express();
    app.get('/api/https-health', httpsHealthCheckHandler);

    const res = await request(app).get('/api/https-health');

    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.message).toMatch(/reverse proxy ssl|reverse proxy/i);
    // Ensure it did not attempt to contact local HTTPS by checking presence of checks
    expect(res.body.data).toHaveProperty('checks');
  });
});
