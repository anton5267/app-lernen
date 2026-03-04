function sanitizeShareTitle(rawTitle, fallbackName) {
  const title = String(rawTitle ?? '').trim().slice(0, 120);
  if (title) {
    return title;
  }
  return `Колекція ${fallbackName}`;
}

function parseShareExpiresInDays(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const normalized = Math.floor(parsed);
  if (normalized < 1 || normalized > 365) {
    return null;
  }

  return normalized;
}

function buildShareExpiresAt(days, nowMs = Date.now()) {
  if (!days) {
    return null;
  }

  return new Date(nowMs + days * 24 * 60 * 60 * 1000).toISOString();
}

function isShareExpired(share, nowMs = Date.now()) {
  if (!share?.expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(share.expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) {
    return false;
  }

  return expiresAtMs <= nowMs;
}

function getPublicBaseUrl(req) {
  const protoHeader = req.headers['x-forwarded-proto'];
  const protocol = typeof protoHeader === 'string' ? protoHeader.split(',')[0] : req.protocol;
  return `${protocol}://${req.get('host')}`;
}

function mapShareLink(share, req) {
  const baseUrl = getPublicBaseUrl(req);
  const expired = isShareExpired(share);
  return {
    id: share.id,
    token: share.token,
    title: share.title,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt ?? null,
    expired,
    url: `${baseUrl}/shared/${share.token}`,
  };
}

function mapSharedFavorite(item) {
  return {
    mediaType: item.mediaType === 'tv' ? 'tv' : 'movie',
    tmdbId: item.tmdbId,
    title: item.title,
    poster: item.poster ?? null,
    rating: item.rating ?? null,
    year: item.year ?? null,
    watched: Boolean(item.watched),
    personalRating: item.personalRating ?? null,
  };
}

module.exports = {
  sanitizeShareTitle,
  parseShareExpiresInDays,
  buildShareExpiresAt,
  isShareExpired,
  mapShareLink,
  mapSharedFavorite,
};
