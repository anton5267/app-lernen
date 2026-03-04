function parseHistoryMediaType(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'movie' || normalized === 'tv' || normalized === 'youtube' || normalized === 'twitch') {
    return normalized;
  }
  return null;
}

function parseHistoryYear(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const digits = String(value)
    .trim()
    .replace(/\D/g, '')
    .slice(0, 4);
  if (digits.length !== 4) {
    return null;
  }
  return digits;
}

function parseHistoryLimit(value, fallback = 50, max = 200) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(raw), 1), max);
}

function normalizeHistoryPayload(raw) {
  const mediaType = parseHistoryMediaType(raw?.mediaType);
  const contentId = String(raw?.contentId ?? '').trim().slice(0, 160);
  const title = String(raw?.title ?? '').trim().slice(0, 240);
  if (!mediaType || !contentId || !title) {
    return null;
  }

  const poster = raw?.poster ? String(raw.poster).trim().slice(0, 500) : null;
  const ratingNum = Number(raw?.rating);
  const rating = Number.isFinite(ratingNum) ? Math.max(0, Math.min(10, ratingNum)) : null;
  const year = parseHistoryYear(raw?.year);
  const externalUrl = raw?.externalUrl ? String(raw.externalUrl).trim().slice(0, 700) : null;
  const channelTitle = raw?.channelTitle ? String(raw.channelTitle).trim().slice(0, 200) : null;

  return {
    mediaType,
    contentId,
    title,
    poster,
    rating,
    year,
    externalUrl,
    channelTitle,
  };
}

function mapHistoryItem(item) {
  return {
    id: item.id,
    userId: item.userId,
    mediaType: parseHistoryMediaType(item.mediaType) ?? 'movie',
    contentId: String(item.contentId ?? ''),
    title: String(item.title ?? ''),
    poster: item.poster ?? null,
    rating: item.rating ?? null,
    year: item.year ?? null,
    externalUrl: item.externalUrl ?? null,
    channelTitle: item.channelTitle ?? null,
    viewedAt: item.viewedAt,
  };
}

function pruneHistoryForUser(entries, userId, maxItems = 100) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const overflowIds = new Set(
    safeEntries
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => String(b.viewedAt ?? '').localeCompare(String(a.viewedAt ?? '')))
      .slice(maxItems)
      .map((entry) => entry.id)
  );

  if (overflowIds.size === 0) {
    return safeEntries;
  }
  return safeEntries.filter((entry) => !overflowIds.has(entry.id));
}

module.exports = {
  parseHistoryMediaType,
  parseHistoryLimit,
  normalizeHistoryPayload,
  mapHistoryItem,
  pruneHistoryForUser,
};
