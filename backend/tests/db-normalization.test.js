const fs = require('fs');
const os = require('os');
const path = require('path');

describe('DB normalization/compaction', () => {
  const prevDataFile = process.env.DATA_FILE_PATH;
  const prevDataDir = process.env.DATA_DIR;
  let tempRoot;
  let dataFile;
  let normalizedDb;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'app-lernen-db-normalization-test-'));
    dataFile = path.join(tempRoot, 'db.json');

    const now = Date.now();
    const history = [
      {
        id: 'hdup-old',
        userId: 'u1',
        mediaType: 'movie',
        contentId: 'same',
        title: 'Old history entry',
        viewedAt: new Date(now - 5000).toISOString(),
      },
      {
        id: 'hdup-new',
        userId: 'u1',
        mediaType: 'movie',
        contentId: 'same',
        title: 'Newest history entry',
        viewedAt: new Date(now + 100000).toISOString(),
      },
    ];

    for (let index = 0; index < 110; index += 1) {
      history.push({
        id: `h-u1-${index}`,
        userId: 'u1',
        mediaType: 'movie',
        contentId: `u1-${index}`,
        title: `Item ${index}`,
        viewedAt: new Date(now - index * 1000).toISOString(),
      });
    }

    history.push(
      {
        id: 'h-u2-1',
        userId: 'u2',
        mediaType: 'tv',
        contentId: 'u2-1',
        title: 'U2 A',
        viewedAt: new Date(now - 1000).toISOString(),
      },
      {
        id: 'h-u2-2',
        userId: 'u2',
        mediaType: 'youtube',
        contentId: 'u2-2',
        title: 'U2 B',
        viewedAt: new Date(now - 2000).toISOString(),
      }
    );

    const legacyPayload = {
      users: [],
      favorites: [
        {
          id: 'fav-old',
          userId: 'u1',
          mediaType: 'movie',
          tmdbId: 42,
          title: 'Legacy Favorite Old',
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
        },
        {
          id: 'fav-new',
          userId: 'u1',
          mediaType: 'movie',
          tmdbId: 42,
          title: 'Legacy Favorite New',
          createdAt: '2021-01-01T00:00:00.000Z',
          updatedAt: '2021-01-01T00:00:00.000Z',
        },
        {
          id: 'fav-tv',
          userId: 'u1',
          mediaType: 'tv',
          tmdbId: 42,
          title: 'Legacy Favorite TV',
          createdAt: '2022-01-01T00:00:00.000Z',
          updatedAt: '2022-01-01T00:00:00.000Z',
        },
      ],
      history,
      uploads: [
        {
          id: 'upload-ok',
          userId: 'u1',
          originalName: 'demo.mp4',
          filename: 'file-1.mp4',
          mimetype: 'video/mp4',
          size: 2048,
          url: '/uploads/file-1.mp4',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
        {
          id: 'upload-missing-url',
          userId: 'u1',
          filename: 'file-2.mp4',
          size: 'bad-size',
          createdAt: 'bad-date',
        },
        {
          id: '',
          userId: 'u1',
          filename: 'broken.mp4',
        },
      ],
      shares: [
        {
          id: 'share-old',
          userId: 'u1',
          token: 'token-1',
          title: 'Old',
          createdAt: '2023-01-01T00:00:00.000Z',
          expiresAt: 'bad-date',
        },
        {
          id: 'share-new',
          userId: 'u1',
          token: 'token-1',
          title: 'New',
          createdAt: '2024-01-01T00:00:00.000Z',
          expiresAt: '2024-02-01T00:00:00.000Z',
        },
        {
          id: 'share-no-title',
          userId: 'u2',
          token: 'token-2',
          title: '',
          createdAt: 'bad-date',
        },
        {
          id: '',
          userId: 'u2',
          token: 'broken-token',
        },
      ],
    };

    fs.writeFileSync(dataFile, JSON.stringify(legacyPayload, null, 2), 'utf8');

    process.env.DATA_FILE_PATH = dataFile;
    process.env.DATA_DIR = tempRoot;

    jest.resetModules();
    const dbModule = require('../src/db');
    await dbModule.initDb();
    normalizedDb = dbModule.getDb();
  });

  it('deduplicates favorites by user + mediaType + tmdbId and keeps latest item', () => {
    expect(normalizedDb.favorites).toHaveLength(2);
    expect(normalizedDb.favorites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'u1',
          mediaType: 'movie',
          tmdbId: 42,
          title: 'Legacy Favorite New',
        }),
        expect.objectContaining({
          userId: 'u1',
          mediaType: 'tv',
          tmdbId: 42,
        }),
      ])
    );
  });

  it('deduplicates history by key and keeps at most 100 items per user', () => {
    const user1Items = normalizedDb.history.filter((item) => item.userId === 'u1');
    const user2Items = normalizedDb.history.filter((item) => item.userId === 'u2');

    expect(user1Items).toHaveLength(100);
    expect(user2Items).toHaveLength(2);

    expect(user1Items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'hdup-new',
          contentId: 'same',
          title: 'Newest history entry',
        }),
      ])
    );

    expect(user1Items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'hdup-old',
          contentId: 'same',
        }),
      ])
    );
  });

  it('normalizes uploads and filters invalid entries', () => {
    expect(normalizedDb.uploads).toHaveLength(2);
    expect(normalizedDb.uploads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'upload-ok',
          url: '/uploads/file-1.mp4',
          size: 2048,
        }),
        expect.objectContaining({
          id: 'upload-missing-url',
          originalName: 'file-2.mp4',
          url: '/uploads/file-2.mp4',
          size: 0,
        }),
      ])
    );
  });

  it('deduplicates shares by token and normalizes title/expiration', () => {
    expect(normalizedDb.shares).toHaveLength(2);
    expect(normalizedDb.shares).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'share-new',
          token: 'token-1',
          title: 'New',
          expiresAt: '2024-02-01T00:00:00.000Z',
        }),
        expect.objectContaining({
          id: 'share-no-title',
          token: 'token-2',
          title: 'Shared collection',
          expiresAt: null,
        }),
      ])
    );
  });

  afterAll(() => {
    if (prevDataFile === undefined) {
      delete process.env.DATA_FILE_PATH;
    } else {
      process.env.DATA_FILE_PATH = prevDataFile;
    }

    if (prevDataDir === undefined) {
      delete process.env.DATA_DIR;
    } else {
      process.env.DATA_DIR = prevDataDir;
    }
  });
});
