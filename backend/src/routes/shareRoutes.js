const {
  buildShareExpiresAt,
  isShareExpired,
  mapShareLink,
  mapSharedFavorite,
  parseShareExpiresInDays,
  sanitizeShareTitle,
} = require('../share');

function registerShareRoutes({ app, authRequired, shareCreateLimiter, getDb, persist, createId }) {
  app.get('/api/favorites/share', authRequired, (req, res) => {
    const db = getDb();
    const items = db.shares
      .filter((item) => item.userId === req.auth.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => mapShareLink(item, req));

    return res.json({ items });
  });

  app.post('/api/favorites/share', authRequired, shareCreateLimiter, async (req, res, next) => {
    try {
      const db = getDb();
      const user = db.users.find((item) => item.id === req.auth.userId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const rawExpiresInDays = req.body?.expiresInDays;
      const expiresInDays = parseShareExpiresInDays(rawExpiresInDays);
      if (rawExpiresInDays !== undefined && rawExpiresInDays !== null && rawExpiresInDays !== '' && !expiresInDays) {
        return res.status(400).json({ error: 'expiresInDays must be an integer between 1 and 365' });
      }

      const now = new Date().toISOString();
      const share = {
        id: createId(),
        userId: req.auth.userId,
        token: createId(),
        title: sanitizeShareTitle(req.body?.title, user.name),
        createdAt: now,
        expiresAt: buildShareExpiresAt(expiresInDays),
      };

      db.shares.push(share);
      await persist();
      return res.status(201).json({ item: mapShareLink(share, req) });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/favorites/share/:id', authRequired, async (req, res, next) => {
    try {
      const db = getDb();
      const index = db.shares.findIndex(
        (item) => item.id === req.params.id && item.userId === req.auth.userId
      );
      if (index === -1) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      db.shares.splice(index, 1);
      await persist();
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/share/:token', (req, res) => {
    const token = String(req.params.token ?? '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const db = getDb();
    const share = db.shares.find((item) => item.token === token);
    if (!share) {
      return res.status(404).json({ error: 'Share link not found' });
    }
    if (isShareExpired(share)) {
      return res.status(410).json({ error: 'Share link expired' });
    }

    const owner = db.users.find((item) => item.id === share.userId);
    const items = db.favorites
      .filter((item) => item.userId === share.userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(mapSharedFavorite);

    return res.json({
      share: {
        id: share.id,
        title: share.title,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt ?? null,
        expired: false,
        ownerName: owner?.name ?? 'Користувач',
      },
      items,
    });
  });
}

module.exports = {
  registerShareRoutes,
};
