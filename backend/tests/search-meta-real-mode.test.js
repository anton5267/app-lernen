const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('External search meta in real mode', () => {
  let app;

  beforeAll(async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'app-lernen-backend-real-meta-test-'));
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_ORIGIN = 'http://localhost:19007';
    process.env.DATA_FILE_PATH = path.join(tempRoot, 'db.json');
    process.env.UPLOADS_DIR = path.join(tempRoot, 'uploads');
    process.env.RATE_LIMIT_MAX = '10000';
    process.env.AUTH_RATE_LIMIT_MAX = '10000';
    process.env.UPLOAD_RATE_LIMIT_MAX = '10000';
    process.env.SHARE_CREATE_RATE_LIMIT_MAX = '10000';
    process.env.YOUTUBE_API_KEY = 'test-youtube-key';
    process.env.TWITCH_CLIENT_ID = 'test-twitch-client';
    process.env.TWITCH_CLIENT_SECRET = 'test-twitch-secret';

    jest.resetModules();
    const { createApp } = require('../src/server');
    app = await createApp();
  });

  afterAll(() => {
    delete process.env.DATA_FILE_PATH;
    delete process.env.UPLOADS_DIR;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.AUTH_RATE_LIMIT_MAX;
    delete process.env.UPLOAD_RATE_LIMIT_MAX;
    delete process.env.SHARE_CREATE_RATE_LIMIT_MAX;
    delete process.env.YOUTUBE_API_KEY;
    delete process.env.TWITCH_CLIENT_ID;
    delete process.env.TWITCH_CLIENT_SECRET;
  });

  it('returns query_required meta for empty youtube query in real mode', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ query: '', type: 'youtube', page: 1 })
      .expect(200);

    expect(response.body).toMatchObject({
      searchType: 'youtube',
      meta: {
        sourceMode: 'real',
        reason: 'query_required',
      },
    });
  });

  it('returns query_required meta for empty twitch query in real mode', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ query: '', type: 'twitch', page: 1 })
      .expect(200);

    expect(response.body).toMatchObject({
      searchType: 'twitch',
      meta: {
        sourceMode: 'real',
        reason: 'query_required',
      },
    });
  });
});
