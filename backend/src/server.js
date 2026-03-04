const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const { initDb, getDb, persist } = require('./db');
const {
  authRequired,
} = require('./auth');
const { registerAuthRoutes } = require('./routes/authRoutes');
const { registerContentRoutes } = require('./routes/contentRoutes');
const { registerFavoriteRoutes } = require('./routes/favoriteRoutes');
const { registerHistoryRoutes } = require('./routes/historyRoutes');
const { registerShareRoutes } = require('./routes/shareRoutes');
const { registerUploadRoutes } = require('./routes/uploadRoutes');
const { registerAdminRoutes } = require('./routes/adminRoutes');
const { buildCorsOptions, createRateLimiters } = require('./http');
const { createSourceChecker, formatSourceModeLog } = require('./sources');
const { createUploadMiddleware, normalizeServerError } = require('./uploads');
const { applyWebAssetCacheHeaders, setNoStoreHeaders } = require('./cacheHeaders');
const {
  clearTmdbCache,
  getTmdbCacheStats,
} = require('./tmdb');
const {
  clearVideoPlatformsCache,
  getVideoPlatformsCacheStats,
} = require('./videoPlatforms');
const {
  mapUserForApi,
  normalizeUserSettings,
} = require('./user');
const {
  frontendOrigins,
  port,
  uploadsDir,
  backendRootDir,
  trustProxy,
  securityHeadersEnabled,
  rateLimitWindowMs,
  rateLimitMax,
  authRateLimitMax,
  uploadRateLimitMax,
  shareCreateRateLimitMax,
  tmdbApiKey,
  youtubeApiKey,
  twitchClientId,
  twitchClientSecret,
  googleClientId,
  adminEmails,
  nodeEnv,
} = require('./config');

function mapUser(user) {
  return mapUserForApi(user, adminEmails);
}

function toDemoEmail(name) {
  const normalized = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40);

  return `${normalized || 'guest'}@demo.local`;
}

function getUserSettingsWithFallback(user) {
  return normalizeUserSettings(user?.settings);
}

async function createApp() {
  await initDb();

  const app = express();
  const upload = createUploadMiddleware(uuidv4);
  const isSourceConfigured = createSourceChecker({
    tmdbApiKey,
    youtubeApiKey,
    twitchClientId,
    twitchClientSecret,
  });
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);

  if (securityHeadersEnabled) {
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );
  }

  const { apiLimiter, authLimiter, uploadLimiter, shareCreateLimiter } = createRateLimiters({
    rateLimitWindowMs,
    rateLimitMax,
    authRateLimitMax,
    uploadRateLimitMax,
    shareCreateRateLimitMax,
  });

  app.use(
    cors(buildCorsOptions(frontendOrigins))
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(uploadsDir));
  app.use('/api', apiLimiter);
  const webDistDir = path.resolve(backendRootDir, '../my-app-2/dist');
  const webIndexPath = path.join(webDistDir, 'index.html');
  const hasWebBuild = fs.existsSync(webIndexPath);

  registerContentRoutes({
    app,
    googleClientId,
    isSourceConfigured,
  });

  registerAuthRoutes({
    app,
    authRequired,
    authLimiter,
    getDb,
    persist,
    createId: uuidv4,
    mapUser,
    toDemoEmail,
    getUserSettingsWithFallback,
  });

  registerHistoryRoutes({
    app,
    authRequired,
    getDb,
    persist,
    createId: uuidv4,
  });

  registerShareRoutes({
    app,
    authRequired,
    shareCreateLimiter,
    getDb,
    persist,
    createId: uuidv4,
  });

  registerFavoriteRoutes({
    app,
    authRequired,
    getDb,
    persist,
    createId: uuidv4,
  });

  registerUploadRoutes({
    app,
    authRequired,
    uploadLimiter,
    upload,
    getDb,
    persist,
    createId: uuidv4,
  });

  registerAdminRoutes({
    app,
    authRequired,
    getDb,
    mapUser,
    getTmdbCacheStats,
    clearTmdbCache,
    getVideoPlatformsCacheStats,
    clearVideoPlatformsCache,
  });

  if (hasWebBuild) {
    app.use(
      express.static(webDistDir, {
        index: false,
        setHeaders: (res, filePath) => {
          applyWebAssetCacheHeaders(res, filePath);
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }

      setNoStoreHeaders(res);
      return res.sendFile(webIndexPath);
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((error, _req, res, _next) => {
    const normalized = normalizeServerError(error);
    const status = normalized.status;
    const message = normalized.message;
    res.status(status).json({ error: message });
  });

  return app;
}

async function startServer() {
  const app = await createApp();
  const isSourceConfigured = createSourceChecker({
    tmdbApiKey,
    youtubeApiKey,
    twitchClientId,
    twitchClientSecret,
  });
  return app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend API running on http://localhost:${port}`);
    // eslint-disable-next-line no-console
    console.log(formatSourceModeLog(isSourceConfigured, nodeEnv));
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start backend:', error);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  startServer,
};
