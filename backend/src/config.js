const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const backendRootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendRootDir, '.env') });

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(backendRootDir, 'uploads');
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(backendRootDir, 'data');
const dataFilePath = process.env.DATA_FILE_PATH
  ? path.resolve(process.env.DATA_FILE_PATH)
  : path.resolve(dataDir, 'db.json');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });

function asNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function asBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
}

function asTrustProxy(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  return value;
}

function asOrigins(value, fallback) {
  const raw = value ?? fallback;
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function asEmails(value, fallback = '') {
  return String(value ?? fallback)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

module.exports = {
  port: asNumber(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendOrigins: asOrigins(process.env.FRONTEND_ORIGIN, 'http://localhost:19007'),
  tmdbApiKey: process.env.TMDB_API_KEY ?? '',
  tmdbBaseUrl: process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3',
  watchRegion: process.env.WATCH_REGION ?? 'UA',
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? '',
  twitchClientId: process.env.TWITCH_CLIENT_ID ?? '',
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  adminEmails: asEmails(process.env.ADMIN_EMAILS, ''),
  uploadMaxSizeMb: asNumber(process.env.UPLOAD_MAX_SIZE_MB, 200),
  trustProxy: asTrustProxy(process.env.TRUST_PROXY, 1),
  securityHeadersEnabled: asBoolean(process.env.SECURITY_HEADERS_ENABLED, true),
  rateLimitWindowMs: asNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: asNumber(process.env.RATE_LIMIT_MAX, 600),
  authRateLimitMax: asNumber(process.env.AUTH_RATE_LIMIT_MAX, 30),
  uploadRateLimitMax: asNumber(process.env.UPLOAD_RATE_LIMIT_MAX, 20),
  shareCreateRateLimitMax: asNumber(process.env.SHARE_CREATE_RATE_LIMIT_MAX, 60),
  uploadsDir,
  dataFilePath,
  backendRootDir,
};
