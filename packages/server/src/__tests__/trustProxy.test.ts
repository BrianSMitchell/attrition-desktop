import request from 'supertest';

// Important: set NODE_ENV=test before importing app so server doesn't start
const OLD_ENV = process.env;
process.env = { ...OLD_ENV, NODE_ENV: 'test' };

import { app } from '../index';

describe('trust proxy configuration and secure detection', () => {
  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('app has trust proxy set to 1', () => {
    // Express allows reading the setting
    // @ts-ignore - app has get for settings
    expect((app as any).get('trust proxy')).toBe(1);
  });

  test('secure detection true when X-Forwarded-Proto is https', async () => {
    const res = await request(app)
      .get('/api/status')
      .set('X-Forwarded-Proto', 'https');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('secure', true);
  });

  test('secure detection false when X-Forwarded-Proto is http', async () => {
    const res = await request(app)
      .get('/api/status')
      .set('X-Forwarded-Proto', 'http');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('secure', false);
  });
});