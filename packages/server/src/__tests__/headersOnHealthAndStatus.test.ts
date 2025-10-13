import request from 'supertest';
import { API_ENDPOINTS } from '../constants/api-endpoints';


import { HTTP_STATUS } from '@shared/response-formats';
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
      .get(API_ENDPOINTS.SYSTEM.HEALTH)
      .set('X-Forwarded-Proto', 'https');

    expect(res.status).toBe(HTTP_STATUS.OK);
    const headers = res.headers;
    for (const h of mustHeaders) {
      expect(headers[h]).toBeDefined();
    }
  });

  test('/api/status has core security headers and secure=true (proxied https)', async () => {
    const res = await request(app)
      .get(API_ENDPOINTS.SYSTEM.STATUS)
      .set('X-Forwarded-Proto', 'https');

    expect(res.status).toBe(HTTP_STATUS.OK);
    const headers = res.headers;
    for (const h of mustHeaders) {
      expect(headers[h]).toBeDefined();
    }
    expect(res.body).toHaveProperty('data.secure', true);
  });
});


