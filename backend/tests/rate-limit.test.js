const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('Backend rate limiting', () => {
  let app;

  beforeAll(async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'app-lernen-backend-rate-limit-test-'));
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_ORIGIN = 'http://localhost:19007';
    process.env.DATA_FILE_PATH = path.join(tempRoot, 'db.json');
    process.env.UPLOADS_DIR = path.join(tempRoot, 'uploads');
    process.env.RATE_LIMIT_MAX = '1000';
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    process.env.SECURITY_HEADERS_ENABLED = 'true';

    jest.resetModules();
    const { createApp } = require('../src/server');
    app = await createApp();
  });

  afterAll(() => {
    delete process.env.DATA_FILE_PATH;
    delete process.env.UPLOADS_DIR;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.AUTH_RATE_LIMIT_MAX;
    delete process.env.SECURITY_HEADERS_ENABLED;
  });

  it('limits repeated auth attempts with 429', async () => {
    await request(app).post('/api/auth/demo').send({ name: 'Rate Test 1' }).expect(200);
    await request(app).post('/api/auth/demo').send({ name: 'Rate Test 2' }).expect(200);

    const limited = await request(app).post('/api/auth/demo').send({ name: 'Rate Test 3' }).expect(429);
    expect(limited.body).toEqual({
      error: 'Too many auth attempts. Please try again later.',
    });
  });
});
