const {
  mapHistoryItem,
  normalizeHistoryPayload,
  parseHistoryLimit,
  parseHistoryMediaType,
  pruneHistoryForUser,
} = require('../history');

function registerHistoryRoutes({ app, authRequired, getDb, persist, createId }) {
  app.get('/api/history', authRequired, (req, res) => {
    const db = getDb();
    const limit = parseHistoryLimit(req.query.limit);

    const items = (db.history ?? [])
      .filter((item) => item.userId === req.auth.userId)
      .sort((a, b) => b.viewedAt.localeCompare(a.viewedAt))
      .slice(0, limit)
      .map(mapHistoryItem);

    return res.json({ items });
  });

  app.post('/api/history', authRequired, async (req, res, next) => {
    try {
      const parsed = normalizeHistoryPayload(req.body);
      if (!parsed) {
        return res.status(400).json({ error: 'mediaType, contentId, title are required.' });
      }

      const db = getDb();
      db.history = Array.isArray(db.history) ? db.history : [];

      const now = new Date().toISOString();
      const existing = db.history.find(
        (item) =>
          item.userId === req.auth.userId &&
          parseHistoryMediaType(item.mediaType) === parsed.mediaType &&
          String(item.contentId ?? '') === parsed.contentId
      );

      if (existing) {
        Object.assign(existing, parsed, { viewedAt: now, updatedAt: now });
        await persist();
        return res.json({ item: mapHistoryItem(existing), updated: true });
      }

      const item = {
        id: createId(),
        userId: req.auth.userId,
        ...parsed,
        viewedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      db.history.push(item);
      db.history = pruneHistoryForUser(db.history, req.auth.userId, 100);

      await persist();
      return res.status(201).json({ item: mapHistoryItem(item), updated: false });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/history', authRequired, async (req, res, next) => {
    try {
      const db = getDb();
      db.history = Array.isArray(db.history) ? db.history : [];
      const before = db.history.length;
      db.history = db.history.filter((item) => item.userId !== req.auth.userId);
      const cleared = before - db.history.length;
      await persist();
      return res.json({ cleared });
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = {
  registerHistoryRoutes,
};
