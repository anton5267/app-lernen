const fs = require('fs');
const os = require('os');
const path = require('path');

describe('DB migration', () => {
  const prevDataFile = process.env.DATA_FILE_PATH;
  const prevDataDir = process.env.DATA_DIR;
  let tempRoot;
  let dataFile;
  let migratedDb;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'app-lernen-db-migration-test-'));
    dataFile = path.join(tempRoot, 'db.json');

    const legacyPayload = {
      users: [],
      favorites: [
        {
          id: 'fav-1',
          userId: 'user-1',
          tmdbId: 123,
          title: 'Legacy Favorite',
          rating: 8,
          year: '2020',
          watched: false,
          personalRating: null,
          notes: '',
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
        },
      ],
      uploads: [],
      shares: [],
    };

    fs.writeFileSync(dataFile, JSON.stringify(legacyPayload, null, 2), 'utf8');

    process.env.DATA_FILE_PATH = dataFile;
    process.env.DATA_DIR = tempRoot;

    jest.resetModules();
    const dbModule = require('../src/db');
    await dbModule.initDb();
    migratedDb = dbModule.getDb();
  });

  it('adds mediaType=movie for legacy favorites without mediaType', () => {
    expect(migratedDb.favorites).toHaveLength(1);
    expect(migratedDb.favorites[0]).toMatchObject({
      tmdbId: 123,
      title: 'Legacy Favorite',
      mediaType: 'movie',
    });
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
