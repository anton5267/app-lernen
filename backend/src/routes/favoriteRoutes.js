const {
  normalizeImportedFavorite,
  parseFavoriteMediaType,
  parsePersonalRating,
  toFavoriteKey,
} = require('../favorites');

function registerFavoriteRoutes({ app, authRequired, getDb, persist, createId }) {
  app.get('/api/favorites', authRequired, (req, res) => {
    const db = getDb();
    const items = db.favorites
      .filter((item) => item.userId === req.auth.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return res.json({ items });
  });

  app.get('/api/favorites/export', authRequired, (req, res) => {
    const db = getDb();
    const items = db.favorites
      .filter((item) => item.userId === req.auth.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return res.json({
      version: 2,
      exportedAt: new Date().toISOString(),
      items,
    });
  });

  app.post('/api/favorites/import', authRequired, async (req, res, next) => {
    try {
      const mode = req.body?.mode === 'replace' ? 'replace' : 'merge';
      const rawItems = Array.isArray(req.body?.items)
        ? req.body.items
        : Array.isArray(req.body)
          ? req.body
          : [];

      if (rawItems.length === 0) {
        return res.status(400).json({ error: 'items array is required' });
      }

      const parsed = rawItems.map(normalizeImportedFavorite).filter(Boolean);
      if (parsed.length === 0) {
        return res.status(400).json({ error: 'No valid favorite items for import' });
      }

      const byFavoriteKey = new Map();
      parsed.forEach((item) => {
        byFavoriteKey.set(toFavoriteKey(item.mediaType, item.tmdbId), item);
      });
      const uniqueItems = [...byFavoriteKey.values()];

      const db = getDb();
      const existing = db.favorites.filter((item) => item.userId === req.auth.userId);
      const existingFavoriteKeys = new Set(
        existing.map((item) => toFavoriteKey(item.mediaType, item.tmdbId))
      );

      if (mode === 'replace') {
        db.favorites = db.favorites.filter((item) => item.userId !== req.auth.userId);
      }

      let imported = 0;
      let skipped = 0;
      const now = new Date().toISOString();

      uniqueItems.forEach((item) => {
        const key = toFavoriteKey(item.mediaType, item.tmdbId);
        if (mode === 'merge' && existingFavoriteKeys.has(key)) {
          skipped += 1;
          return;
        }

        db.favorites.push({
          id: createId(),
          userId: req.auth.userId,
          mediaType: item.mediaType,
          tmdbId: item.tmdbId,
          title: item.title,
          poster: item.poster,
          rating: item.rating,
          year: item.year,
          watched: item.watched,
          personalRating: item.personalRating,
          notes: item.notes,
          createdAt: now,
          updatedAt: now,
        });
        imported += 1;
      });

      await persist();
      return res.json({
        mode,
        total: uniqueItems.length,
        imported,
        skipped,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/favorites', authRequired, async (req, res, next) => {
    try {
      const payload = req.body ?? {};
      const tmdbId = Number(payload.tmdbId);
      const title = String(payload.title ?? '').trim();
      const rawMediaType = payload.mediaType;
      const mediaType = parseFavoriteMediaType(rawMediaType);
      const poster = payload.poster ? String(payload.poster) : null;
      const rating = Number.isFinite(Number(payload.rating)) ? Number(payload.rating) : null;
      const year = payload.year ? String(payload.year) : null;

      if (rawMediaType !== undefined && rawMediaType !== 'movie' && rawMediaType !== 'tv') {
        return res.status(400).json({ error: 'mediaType must be movie or tv' });
      }

      if (!Number.isFinite(tmdbId) || !title) {
        return res.status(400).json({ error: 'tmdbId and title are required' });
      }

      const db = getDb();
      const existing = db.favorites.find(
        (item) =>
          item.userId === req.auth.userId &&
          parseFavoriteMediaType(item.mediaType) === mediaType &&
          Number(item.tmdbId) === tmdbId
      );
      if (existing) {
        return res.status(200).json({ item: existing, duplicated: true });
      }

      const now = new Date().toISOString();
      const item = {
        id: createId(),
        userId: req.auth.userId,
        mediaType,
        tmdbId,
        title,
        poster,
        rating,
        year,
        watched: false,
        personalRating: null,
        notes: '',
        createdAt: now,
        updatedAt: now,
      };

      db.favorites.push(item);
      await persist();
      return res.status(201).json({ item });
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/favorites/:id', authRequired, async (req, res, next) => {
    try {
      const db = getDb();
      const item = db.favorites.find(
        (fav) => fav.id === req.params.id && fav.userId === req.auth.userId
      );
      if (!item) {
        return res.status(404).json({ error: 'Favorite not found' });
      }

      if (typeof req.body?.watched === 'boolean') {
        item.watched = req.body.watched;
      }

      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'personalRating')) {
        item.personalRating = parsePersonalRating(req.body.personalRating);
      }

      if (typeof req.body?.notes === 'string') {
        item.notes = req.body.notes.slice(0, 1500);
      }

      item.updatedAt = new Date().toISOString();
      await persist();
      return res.json({ item });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/favorites/:id', authRequired, async (req, res, next) => {
    try {
      const db = getDb();
      const index = db.favorites.findIndex(
        (item) => item.id === req.params.id && item.userId === req.auth.userId
      );
      if (index === -1) {
        return res.status(404).json({ error: 'Favorite not found' });
      }

      db.favorites.splice(index, 1);
      await persist();
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = {
  registerFavoriteRoutes,
};
