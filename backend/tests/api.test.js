const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('Backend API integration', () => {
  const previousEnv = {
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
  };

  let app;
  let agent;
  let dbModule;

  beforeAll(async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'app-lernen-backend-test-'));
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_ORIGIN = 'http://localhost:19007';
    process.env.DATA_FILE_PATH = path.join(tempRoot, 'db.json');
    process.env.UPLOADS_DIR = path.join(tempRoot, 'uploads');
    process.env.RATE_LIMIT_MAX = '10000';
    process.env.AUTH_RATE_LIMIT_MAX = '10000';
    process.env.UPLOAD_RATE_LIMIT_MAX = '10000';
    process.env.SHARE_CREATE_RATE_LIMIT_MAX = '10000';
    process.env.ADMIN_EMAILS = 'admin.user@demo.local';
    process.env.TMDB_API_KEY = '';
    process.env.YOUTUBE_API_KEY = '';
    process.env.TWITCH_CLIENT_ID = '';
    process.env.TWITCH_CLIENT_SECRET = '';

    jest.resetModules();
    const { createApp } = require('../src/server');
    dbModule = require('../src/db');
    app = await createApp();
  });

  beforeEach(async () => {
    await dbModule.resetDb();
    agent = request.agent(app);
  });

  afterAll(() => {
    delete process.env.DATA_FILE_PATH;
    delete process.env.UPLOADS_DIR;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.AUTH_RATE_LIMIT_MAX;
    delete process.env.UPLOAD_RATE_LIMIT_MAX;
    delete process.env.SHARE_CREATE_RATE_LIMIT_MAX;
    delete process.env.ADMIN_EMAILS;

    if (previousEnv.TMDB_API_KEY === undefined) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = previousEnv.TMDB_API_KEY;
    }

    if (previousEnv.YOUTUBE_API_KEY === undefined) {
      delete process.env.YOUTUBE_API_KEY;
    } else {
      process.env.YOUTUBE_API_KEY = previousEnv.YOUTUBE_API_KEY;
    }

    if (previousEnv.TWITCH_CLIENT_ID === undefined) {
      delete process.env.TWITCH_CLIENT_ID;
    } else {
      process.env.TWITCH_CLIENT_ID = previousEnv.TWITCH_CLIENT_ID;
    }

    if (previousEnv.TWITCH_CLIENT_SECRET === undefined) {
      delete process.env.TWITCH_CLIENT_SECRET;
    } else {
      process.env.TWITCH_CLIENT_SECRET = previousEnv.TWITCH_CLIENT_SECRET;
    }
  });

  it('returns health payload', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body).toEqual({
      ok: true,
      service: 'movie-api',
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns public config status payload', async () => {
    const response = await request(app).get('/api/config/status').expect(200);
    expect(response.body).toEqual({
      sources: {
        tmdb: { configured: expect.any(Boolean), mode: expect.stringMatching(/^(real|demo)$/) },
        youtube: { configured: expect.any(Boolean), mode: expect.stringMatching(/^(real|demo)$/) },
        twitch: { configured: expect.any(Boolean), mode: expect.stringMatching(/^(real|demo)$/) },
      },
      google: {
        configured: expect.any(Boolean),
      },
    });
    expect(String(response.headers['cache-control'] ?? '')).toContain('no-store');
  });

  it('supports catalog and external search types', async () => {
    const movieResponse = await request(app)
      .get('/api/search')
      .query({ query: 'тем', type: 'movie', page: 1 })
      .expect(200);
    expect(movieResponse.body.searchType).toBe('movie');
    expect(Array.isArray(movieResponse.body.results)).toBe(true);
    expect(movieResponse.body.meta).toMatchObject({
      sourceMode: 'demo',
      reason: 'missing_tmdb_key',
    });

    const tvResponse = await request(app)
      .get('/api/search')
      .query({ query: 'шер', type: 'tv', page: 1 })
      .expect(200);
    expect(tvResponse.body.searchType).toBe('tv');
    expect(tvResponse.body.results.every((item) => item.mediaType === 'tv')).toBe(true);

    const youtubeResponse = await request(app)
      .get('/api/search')
      .query({ query: 'demo', type: 'youtube', page: 1 })
      .expect(200);
    expect(youtubeResponse.body.searchType).toBe('youtube');
    expect(Array.isArray(youtubeResponse.body.results)).toBe(true);
    expect(youtubeResponse.body.meta).toBeDefined();

    const youtubeEmptyQueryResponse = await request(app)
      .get('/api/search')
      .query({ query: '', type: 'youtube', page: 1 })
      .expect(200);
    expect(youtubeEmptyQueryResponse.body.searchType).toBe('youtube');
    expect(youtubeEmptyQueryResponse.body.meta).toMatchObject({
      reason: 'demo_recommendations',
      sourceMode: 'demo',
    });

    const twitchEmptyQueryResponse = await request(app)
      .get('/api/search')
      .query({ query: '', type: 'twitch', page: 1 })
      .expect(200);
    expect(twitchEmptyQueryResponse.body.searchType).toBe('twitch');
    expect(twitchEmptyQueryResponse.body.meta).toMatchObject({
      reason: 'demo_recommendations',
      sourceMode: 'demo',
    });

    await request(app)
      .get('/api/search')
      .query({ query: 'test', type: 'invalid' })
      .expect(400);

    const genresResponse = await request(app).get('/api/genres').query({ type: 'movie' }).expect(200);
    expect(genresResponse.body).toMatchObject({
      type: 'movie',
      sourceMode: 'demo',
    });
    expect(Array.isArray(genresResponse.body.items)).toBe(true);

    const catalogResponse = await request(app)
      .get('/api/catalog')
      .query({
        type: 'movie',
        category: 'popular',
        page: 1,
        sort: 'vote_average.desc',
        minRating: 7,
        yearFrom: 1990,
        yearTo: 2030,
        genres: '28,878',
        watchTypes: 'flatrate,rent',
      })
      .expect(200);
    expect(catalogResponse.body).toMatchObject({
      source: 'catalog',
      searchType: 'movie',
      demoMode: true,
    });
    expect(Array.isArray(catalogResponse.body.results)).toBe(true);

    await request(app).get('/api/catalog').query({ type: 'unknown' }).expect(400);
  });

  it('returns tv details payload', async () => {
    const response = await request(app).get('/api/tv/20001').expect(200);
    expect(response.body).toMatchObject({
      id: 20001,
      mediaType: 'tv',
    });
    expect(response.body.watchProviders).toBeDefined();
    expect(Array.isArray(response.body.watchProviders.items)).toBe(true);
  });

  it('supports local auth and account settings flow', async () => {
    const localAgent = request.agent(app);

    await localAgent
      .post('/api/auth/register')
      .send({ name: 'A', email: 'invalid', password: '123' })
      .expect(400);

    const registered = await localAgent
      .post('/api/auth/register')
      .send({
        name: 'Local User',
        email: 'local.user@example.com',
        password: 'Password123',
      })
      .expect(201);

    expect(registered.body.user).toMatchObject({
      provider: 'local',
      name: 'Local User',
      email: 'local.user@example.com',
      settings: {
        language: 'uk',
        theme: 'system',
        emailNotifications: true,
      },
    });

    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate',
        email: 'local.user@example.com',
        password: 'Password123',
      })
      .expect(409);

    await localAgent.post('/api/auth/logout').expect(204);

    await localAgent
      .post('/api/auth/login')
      .send({
        email: 'local.user@example.com',
        password: 'WrongPassword123',
      })
      .expect(401);

    await localAgent
      .post('/api/auth/login')
      .send({
        email: 'local.user@example.com',
        password: 'Password123',
      })
      .expect(200);

    await localAgent
      .patch('/api/me/profile')
      .send({ picture: 'javascript:alert(1)' })
      .expect(400);

    const profileUpdated = await localAgent
      .patch('/api/me/profile')
      .send({
        name: 'Updated Local User',
        email: 'local.updated@example.com',
        picture: 'https://example.com/avatar.png',
      })
      .expect(200);

    expect(profileUpdated.body.user).toMatchObject({
      provider: 'local',
      name: 'Updated Local User',
      email: 'local.updated@example.com',
      picture: 'https://example.com/avatar.png',
    });

    const settingsUpdated = await localAgent
      .patch('/api/settings')
      .send({
        language: 'en',
        theme: 'dark',
        emailNotifications: false,
      })
      .expect(200);

    expect(settingsUpdated.body.settings).toEqual({
      language: 'en',
      theme: 'dark',
      emailNotifications: false,
    });

    const currentSettings = await localAgent.get('/api/settings').expect(200);
    expect(currentSettings.body.settings).toEqual({
      language: 'en',
      theme: 'dark',
      emailNotifications: false,
    });

    await localAgent
      .post('/api/auth/password/change')
      .send({
        currentPassword: 'WrongPassword123',
        newPassword: 'NewPassword123',
      })
      .expect(401);

    await localAgent
      .post('/api/auth/password/change')
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123',
      })
      .expect(204);

    await localAgent.post('/api/auth/logout').expect(204);

    await localAgent
      .post('/api/auth/login')
      .send({
        email: 'local.updated@example.com',
        password: 'Password123',
      })
      .expect(401);

    await localAgent
      .post('/api/auth/login')
      .send({
        email: 'local.updated@example.com',
        password: 'NewPassword123',
      })
      .expect(200);
  });

  it('stores viewing history and allows clearing it', async () => {
    await agent.post('/api/auth/demo').send({ name: 'History User' }).expect(200);

    await agent
      .post('/api/history')
      .send({
        mediaType: 'movie',
        contentId: '27205',
        title: 'Початок',
        year: '2010',
        rating: 8.8,
        poster: 'https://example.com/inception.jpg',
      })
      .expect(201);

    await agent
      .post('/api/history')
      .send({
        mediaType: 'youtube',
        contentId: 'abc123',
        title: 'Inception Trailer',
        channelTitle: 'Movieclips',
        externalUrl: 'https://www.youtube.com/watch?v=abc123',
      })
      .expect(201);

    const updated = await agent
      .post('/api/history')
      .send({
        mediaType: 'movie',
        contentId: '27205',
        title: 'Початок (оновлено)',
        year: '2010',
      })
      .expect(200);
    expect(updated.body.updated).toBe(true);

    const history = await agent.get('/api/history').expect(200);
    expect(history.body.items).toHaveLength(2);
    expect(history.body.items[0]).toMatchObject({
      mediaType: 'movie',
      contentId: '27205',
      title: 'Початок (оновлено)',
    });
    expect(history.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mediaType: 'youtube',
          contentId: 'abc123',
          title: 'Inception Trailer',
        }),
      ])
    );

    await agent
      .post('/api/history')
      .send({
        mediaType: 'movie',
        contentId: '',
        title: '',
      })
      .expect(400);

    const cleared = await agent.delete('/api/history').expect(200);
    expect(cleared.body).toMatchObject({ cleared: 2 });

    const afterClear = await agent.get('/api/history').expect(200);
    expect(afterClear.body.items).toEqual([]);
  });

  it('uploads a supported video file for authenticated user', async () => {
    await agent.post('/api/auth/demo').send({ name: 'Upload User' }).expect(200);

    const response = await agent
      .post('/api/upload')
      .attach('file', Buffer.from('fake video content'), {
        filename: 'demo.mp4',
        contentType: 'video/mp4',
      })
      .expect(201);

    expect(response.body.item).toMatchObject({
      originalName: 'demo.mp4',
      mimetype: 'video/mp4',
      url: expect.stringMatching(/^\/uploads\//),
    });
    expect(Number(response.body.item.size)).toBeGreaterThan(0);
  });

  it('creates demo session and supports favorites import/export', async () => {
    await request(app).get('/api/favorites').expect(401);

    await agent.post('/api/auth/demo').send({ name: 'Admin User' }).expect(200);

    const me = await agent.get('/api/me').expect(200);
    expect(me.body.user).toMatchObject({
      name: 'Admin User',
      email: 'admin.user@demo.local',
      isAdmin: true,
    });

    const imported = await agent
      .post('/api/favorites/import')
      .send({
        mode: 'merge',
        items: [
          { tmdbId: 501, title: 'Imported Movie', rating: 8.4, year: '2025' },
          { tmdbId: 501, mediaType: 'tv', title: 'Imported Show', rating: 8.8, year: '2025' },
        ],
      })
      .expect(200);
    expect(imported.body).toMatchObject({
      mode: 'merge',
      total: 2,
      imported: 2,
      skipped: 0,
    });

    const importedV1Compat = await agent
      .post('/api/favorites/import')
      .send({
        mode: 'merge',
        items: [{ tmdbId: 701, title: 'Legacy Import Movie' }],
      })
      .expect(200);
    expect(importedV1Compat.body).toMatchObject({
      total: 1,
      imported: 1,
      skipped: 0,
    });

    const exported = await agent.get('/api/favorites/export').expect(200);
    expect(exported.body.version).toBe(2);
    expect(Array.isArray(exported.body.items)).toBe(true);
    expect(exported.body.items).toHaveLength(3);
    expect(exported.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Imported Movie',
          tmdbId: 501,
          mediaType: 'movie',
        }),
        expect.objectContaining({
          title: 'Imported Show',
          tmdbId: 501,
          mediaType: 'tv',
        }),
      ])
    );
  });

  it('deduplicates imports by mediaType + tmdbId key', async () => {
    await agent.post('/api/auth/demo').send({ name: 'Deduplicate User' }).expect(200);

    const response = await agent
      .post('/api/favorites/import')
      .send({
        mode: 'merge',
        items: [
          { tmdbId: 905, mediaType: 'movie', title: 'One' },
          { tmdbId: 905, mediaType: 'movie', title: 'Duplicate One' },
          { tmdbId: 905, mediaType: 'tv', title: 'Same ID Different Type' },
          { tmdbId: 905, mediaType: 'tv', title: 'Duplicate TV' },
        ],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      total: 2,
      imported: 2,
      skipped: 0,
    });
  });

  it('supports share links with expiration and blocks expired tokens', async () => {
    await agent.post('/api/auth/demo').send({ name: 'Share User' }).expect(200);
    await agent
      .post('/api/favorites/import')
      .send({
        mode: 'merge',
        items: [{ tmdbId: 801, title: 'Shared Movie', rating: 9 }],
      })
      .expect(200);

    await agent
      .post('/api/favorites/share')
      .send({ title: 'Bad share', expiresInDays: 999 })
      .expect(400);

    const created = await agent
      .post('/api/favorites/share')
      .send({ title: 'Valid share', expiresInDays: 1 })
      .expect(201);

    const token = created.body.item.token;
    expect(token).toBeTruthy();
    expect(created.body.item.expiresAt).toBeTruthy();
    expect(created.body.item.expired).toBe(false);

    await request(app).get(`/api/share/${token}`).expect(200);

    const db = dbModule.getDb();
    const share = db.shares.find((item) => item.token === token);
    share.expiresAt = '2000-01-01T00:00:00.000Z';
    await dbModule.persist();

    await request(app).get(`/api/share/${token}`).expect(410);
  });

  it('allows admin cache maintenance endpoints and blocks non-admin users', async () => {
    const adminAgent = request.agent(app);
    await adminAgent.post('/api/auth/demo').send({ name: 'Admin User' }).expect(200);

    const statsResponse = await adminAgent.get('/api/admin/cache/stats').expect(200);
    expect(statsResponse.body).toMatchObject({
      admin: {
        email: 'admin.user@demo.local',
      },
      caches: {
        tmdb: expect.any(Object),
        external: expect.any(Object),
      },
    });
    expect(String(statsResponse.headers['cache-control'] ?? '')).toContain('no-store');

    const clearTmdbResponse = await adminAgent
      .post('/api/admin/cache/clear')
      .send({ source: 'tmdb' })
      .expect(200);
    expect(clearTmdbResponse.body).toMatchObject({
      source: 'tmdb',
      cleared: {
        tmdb: expect.any(Object),
      },
      caches: {
        tmdb: expect.any(Object),
        external: expect.any(Object),
      },
    });

    await adminAgent
      .post('/api/admin/cache/clear')
      .send({ source: 'invalid' })
      .expect(400);

    const regularAgent = request.agent(app);
    await regularAgent.post('/api/auth/demo').send({ name: 'Regular User' }).expect(200);
    await regularAgent.get('/api/admin/cache/stats').expect(403);
    await regularAgent
      .post('/api/admin/cache/clear')
      .send({ source: 'all' })
      .expect(403);
  });
});
