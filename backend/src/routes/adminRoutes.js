const { setNoStoreHeaders } = require('../cacheHeaders');

function getAuthorizedAdmin({ req, res, getDb, mapUser }) {
  const db = getDb();
  const user = db.users.find((item) => item.id === req.auth.userId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const mapped = mapUser(user);
  if (!mapped.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return mapped;
}

function registerAdminRoutes({
  app,
  authRequired,
  getDb,
  mapUser,
  getTmdbCacheStats,
  clearTmdbCache,
  getVideoPlatformsCacheStats,
  clearVideoPlatformsCache,
}) {
  app.get('/api/admin/cache/stats', authRequired, (req, res) => {
    const admin = getAuthorizedAdmin({ req, res, getDb, mapUser });
    if (!admin) {
      return;
    }

    setNoStoreHeaders(res);
    res.json({
      admin: {
        id: admin.id,
        email: admin.email,
      },
      caches: {
        tmdb: getTmdbCacheStats(),
        external: getVideoPlatformsCacheStats(),
      },
    });
  });

  app.post('/api/admin/cache/clear', authRequired, (req, res) => {
    const admin = getAuthorizedAdmin({ req, res, getDb, mapUser });
    if (!admin) {
      return;
    }

    const source = String(req.body?.source ?? 'all').trim().toLowerCase();
    const allowed = new Set(['all', 'tmdb', 'external']);
    if (!allowed.has(source)) {
      return res.status(400).json({ error: "source must be one of: all, tmdb, external" });
    }

    const cleared = {};
    if (source === 'all' || source === 'tmdb') {
      cleared.tmdb = clearTmdbCache();
    }
    if (source === 'all' || source === 'external') {
      cleared.external = clearVideoPlatformsCache();
    }

    setNoStoreHeaders(res);
    return res.json({
      source,
      cleared,
      caches: {
        tmdb: getTmdbCacheStats(),
        external: getVideoPlatformsCacheStats(),
      },
    });
  });
}

module.exports = {
  registerAdminRoutes,
};
