function parsePersonalRating(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.max(0, Math.min(10, num));
}

function parseYear(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  const digits = normalized.replace(/\D/g, '').slice(0, 4);
  if (digits.length !== 4) {
    return null;
  }
  return digits;
}

function parseFavoriteMediaType(value) {
  return value === 'tv' ? 'tv' : 'movie';
}

function normalizeImportedFavorite(raw) {
  const tmdbId = Number(raw?.tmdbId);
  const title = String(raw?.title ?? '').trim().slice(0, 240);
  if (!Number.isFinite(tmdbId) || !title) {
    return null;
  }

  const poster = raw?.poster ? String(raw.poster) : null;
  const ratingNum = Number(raw?.rating);
  const rating = Number.isFinite(ratingNum) ? Math.max(0, Math.min(10, ratingNum)) : null;
  const year = parseYear(raw?.year);
  const watched = Boolean(raw?.watched);
  const personalRating = parsePersonalRating(raw?.personalRating);
  const notes = typeof raw?.notes === 'string' ? raw.notes.slice(0, 1500) : '';

  return {
    mediaType: parseFavoriteMediaType(raw?.mediaType),
    tmdbId: Math.floor(tmdbId),
    title,
    poster,
    rating,
    year,
    watched,
    personalRating,
    notes,
  };
}

function toFavoriteKey(mediaType, tmdbId) {
  return `${parseFavoriteMediaType(mediaType)}:${Number(tmdbId)}`;
}

module.exports = {
  normalizeImportedFavorite,
  parseFavoriteMediaType,
  parsePersonalRating,
  toFavoriteKey,
};
