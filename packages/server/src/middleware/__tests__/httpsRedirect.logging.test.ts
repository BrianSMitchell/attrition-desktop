import express from 'express';
import request from 'supertest';
import { httpsRedirectMiddleware } from '../httpsRedirect';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ENV_VARS } from '@game/shared';



// Ensure test env
const OLD_ENV = process.env;
process.env = { ...OLD_ENV, NODE_ENV: 'test' };

describe('httpsRedirectMiddleware logging behavior', () => {
  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('suppresses WARN for exempt /health in reverse proxy mode (still redirects)', async () => {
    process.env[ENV_VARS.NODE_ENV] = 'production';
    process.env[ENV_VARS.USE_REVERSE_PROXY_SSL] = 'true';
    const app = express();
    app.set('trust proxy', 1);
    app.use(httpsRedirectMiddleware);

const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const res = await request(app)
      .get(API_ENDPOINTS.SYSTEM.HEALTH)
      .set('Host', 'localhost:3001')
      .set('X-Forwarded-Proto', 'http');

    expect(res.status).toBe(301);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('logs WARN for non-exempt path in reverse proxy mode', async () => {
    process.env[ENV_VARS.NODE_ENV] = 'production';
    process.env[ENV_VARS.USE_REVERSE_PROXY_SSL] = 'true';
    const app = express();
    app.set('trust proxy', 1);
    app.use(httpsRedirectMiddleware);

const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const res = await request(app)
      .get('/game')
      .set('Host', 'localhost:3001')
      .set('X-Forwarded-Proto', 'http');

    expect(res.status).toBe(301);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

