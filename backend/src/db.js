const fs = require('fs/promises');
const { dataFilePath } = require('./config');
const { normalizeEmail, normalizeUserProvider, normalizeUserSettings } = require('./user');

const DEFAULT_DB = {
  users: [],
  favorites: [],
  history: [],
  uploads: [],
  shares: [],
};
const HISTORY_MAX_PER_USER = 100;

let db = structuredClone(DEFAULT_DB);
let initialized = false;

function normalizeUser(rawUser) {
  if (!rawUser || typeof rawUser !== 'object') {
    return null;
  }

  const id = String(rawUser.id ?? '').trim();
  const email = normalizeEmail(rawUser.email);
  const name = String(rawUser.name ?? '').trim();
  if (!id || !email || !name) {
    return null;
  }

  return {
    ...rawUser,
    id,
    email,
    name,
    provider: normalizeUserProvider(rawUser.provider),
    passwordHash: typeof rawUser.passwordHash === 'string' ? rawUser.passwordHash : null,
    settings: normalizeUserSettings(rawUser.settings),
  };
}

function normalizeFavorite(rawFavorite) {
  if (!rawFavorite || typeof rawFavorite !== 'object') {
    return null;
  }

  const tmdbId = Number(rawFavorite.tmdbId);
  const title = String(rawFavorite.title ?? '').trim();
  if (!Number.isFinite(tmdbId) || !title) {
    return null;
  }

  return {
    ...rawFavorite,
    tmdbId: Math.floor(tmdbId),
    title,
    mediaType: rawFavorite.mediaType === 'tv' ? 'tv' : 'movie',
  };
}

function normalizeHistoryItem(rawHistory) {
  if (!rawHistory || typeof rawHistory !== 'object') {
    return null;
  }

  const id = String(rawHistory.id ?? '').trim();
  const userId = String(rawHistory.userId ?? '').trim();
  const mediaType =
    rawHistory.mediaType === 'tv' ||
    rawHistory.mediaType === 'youtube' ||
    rawHistory.mediaType === 'twitch'
      ? rawHistory.mediaType
      : 'movie';
  const contentId = String(rawHistory.contentId ?? '').trim();
  const title = String(rawHistory.title ?? '').trim();
  if (!id || !userId || !contentId || !title) {
    return null;
  }

  return {
    ...rawHistory,
    id,
    userId,
    mediaType,
    contentId,
    title,
    poster: rawHistory.poster ? String(rawHistory.poster) : null,
    rating: Number.isFinite(Number(rawHistory.rating)) ? Number(rawHistory.rating) : null,
    year: rawHistory.year ? String(rawHistory.year).slice(0, 4) : null,
    externalUrl: rawHistory.externalUrl ? String(rawHistory.externalUrl) : null,
    channelTitle: rawHistory.channelTitle ? String(rawHistory.channelTitle) : null,
    viewedAt: normalizeIsoDate(
      rawHistory.viewedAt ?? rawHistory.updatedAt ?? rawHistory.createdAt,
      new Date().toISOString()
    ),
  };
}

function parseIsoTimestamp(value) {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeIsoDate(value, fallbackIso) {
  const parsed = Date.parse(String(value ?? ''));
  if (!Number.isFinite(parsed)) {
    return fallbackIso;
  }
  return new Date(parsed).toISOString();
}

function normalizeOptionalIsoDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function normalizeUpload(rawUpload) {
  if (!rawUpload || typeof rawUpload !== 'object') {
    return null;
  }

  const id = String(rawUpload.id ?? '').trim();
  const userId = String(rawUpload.userId ?? '').trim();
  const filename = String(rawUpload.filename ?? '').trim();
  if (!id || !userId || !filename) {
    return null;
  }

  const fallbackCreatedAt = new Date().toISOString();
  const size = Number(rawUpload.size);

  return {
    ...rawUpload,
    id,
    userId,
    filename,
    originalName: String(rawUpload.originalName ?? filename),
    mimetype: String(rawUpload.mimetype ?? 'application/octet-stream'),
    size: Number.isFinite(size) && size >= 0 ? size : 0,
    url:
      typeof rawUpload.url === 'string' && rawUpload.url.trim().length > 0
        ? rawUpload.url
        : `/uploads/${filename}`,
    createdAt: normalizeIsoDate(rawUpload.createdAt, fallbackCreatedAt),
  };
}

function normalizeShare(rawShare) {
  if (!rawShare || typeof rawShare !== 'object') {
    return null;
  }

  const id = String(rawShare.id ?? '').trim();
  const userId = String(rawShare.userId ?? '').trim();
  const token = String(rawShare.token ?? '').trim();
  if (!id || !userId || !token) {
    return null;
  }

  const fallbackCreatedAt = new Date().toISOString();
  const title = String(rawShare.title ?? '').trim();

  return {
    ...rawShare,
    id,
    userId,
    token,
    title: title || 'Shared collection',
    createdAt: normalizeIsoDate(rawShare.createdAt, fallbackCreatedAt),
    expiresAt: normalizeOptionalIsoDate(rawShare.expiresAt),
  };
}

function dedupeFavorites(items) {
  const byKey = new Map();
  items.forEach((item) => {
    const key = `${String(item.userId ?? '')}:${item.mediaType}:${item.tmdbId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      return;
    }

    const existingUpdatedAt = parseIsoTimestamp(existing.updatedAt ?? existing.createdAt);
    const nextUpdatedAt = parseIsoTimestamp(item.updatedAt ?? item.createdAt);
    if (nextUpdatedAt >= existingUpdatedAt) {
      byKey.set(key, item);
    }
  });
  return [...byKey.values()];
}

function dedupeHistory(items) {
  const byKey = new Map();
  items.forEach((item) => {
    const key = `${item.userId}:${item.mediaType}:${item.contentId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      return;
    }

    const existingViewedAt = parseIsoTimestamp(existing.viewedAt);
    const nextViewedAt = parseIsoTimestamp(item.viewedAt);
    if (nextViewedAt >= existingViewedAt) {
      byKey.set(key, item);
    }
  });
  return [...byKey.values()];
}

function dedupeShares(items) {
  const byToken = new Map();
  items.forEach((item) => {
    const existing = byToken.get(item.token);
    if (!existing) {
      byToken.set(item.token, item);
      return;
    }

    const existingCreatedAt = parseIsoTimestamp(existing.createdAt);
    const nextCreatedAt = parseIsoTimestamp(item.createdAt);
    if (nextCreatedAt >= existingCreatedAt) {
      byToken.set(item.token, item);
    }
  });
  return [...byToken.values()];
}

function capHistoryByUser(items, maxPerUser = HISTORY_MAX_PER_USER) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = item.userId;
    const userItems = grouped.get(key);
    if (userItems) {
      userItems.push(item);
    } else {
      grouped.set(key, [item]);
    }
  });

  const result = [];
  grouped.forEach((userItems) => {
    userItems.sort((a, b) => parseIsoTimestamp(b.viewedAt) - parseIsoTimestamp(a.viewedAt));
    result.push(...userItems.slice(0, maxPerUser));
  });
  return result;
}

function normalizeDb(parsed) {
  const users = Array.isArray(parsed?.users) ? parsed.users.map(normalizeUser).filter(Boolean) : [];
  const favorites = dedupeFavorites(
    Array.isArray(parsed?.favorites) ? parsed.favorites.map(normalizeFavorite).filter(Boolean) : []
  );
  const history = capHistoryByUser(
    dedupeHistory(Array.isArray(parsed?.history) ? parsed.history.map(normalizeHistoryItem).filter(Boolean) : [])
  );
  const uploads = Array.isArray(parsed?.uploads) ? parsed.uploads.map(normalizeUpload).filter(Boolean) : [];
  const shares = dedupeShares(
    Array.isArray(parsed?.shares) ? parsed.shares.map(normalizeShare).filter(Boolean) : []
  );

  return {
    users,
    favorites,
    history,
    uploads,
    shares,
  };
}

async function initDb() {
  if (initialized) {
    return;
  }

  try {
    const content = await fs.readFile(dataFilePath, 'utf8');
    const parsed = JSON.parse(content);
    db = normalizeDb(parsed);
    await persist();
  } catch {
    await persist();
  }

  initialized = true;
}

async function persist() {
  await fs.writeFile(dataFilePath, JSON.stringify(db, null, 2), 'utf8');
}

function getDb() {
  return db;
}

async function resetDb() {
  db = structuredClone(DEFAULT_DB);
  initialized = true;
  await persist();
}

module.exports = {
  initDb,
  getDb,
  persist,
  resetDb,
};
