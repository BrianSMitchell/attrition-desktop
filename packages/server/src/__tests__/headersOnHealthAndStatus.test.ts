import request from 'supertest';

const OLD_ENV = process.env;
process.env = { ...OLD_ENV, NODE_ENV: 'test' };

import { app } from '../index';

describe('Security headers on /health and /api/status', () => {
  afterAll(() => {
    process.env = OLD_ENV;
  });

  const mustHeaders = [
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options'
  ];

  test('/health has core security headers (proxied https)', async () => {
    const res = await request(app)
      .get('/health')
      .set('X-Forwarded-Proto', 'https');

    expect(res.status).toBe(200);
    const headers = res.headers;
    for (const h of mustHeaders) {
      expect(headers[h]).toBeDefined();
    }
  });

  test('/api/status has core security headers and secure=true (proxied https)', async () => {
    const res = await request(app)
      .get('/api/status')
      .set('X-Forwarded-Proto', 'https');

    expect(res.status).toBe(200);
    const headers = res.headers;
    for (const h of mustHeaders) {
      expect(headers[h]).toBeDefined();
    }
    expect(res.body).toHaveProperty('data.secure', true);
  });
});