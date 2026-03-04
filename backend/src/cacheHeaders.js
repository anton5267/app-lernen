const path = require('path');

const NO_STORE_HEADER = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
const IMMUTABLE_EXTENSIONS = new Set([
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.map',
  '.json',
]);

function getCacheControlForFile(filePath) {
  const extension = path.extname(String(filePath || '')).toLowerCase();
  if (extension === '.html') {
    return NO_STORE_HEADER;
  }

  if (IMMUTABLE_EXTENSIONS.has(extension)) {
    return 'public, max-age=31536000, immutable';
  }

  return 'public, max-age=300';
}

function setNoStoreHeaders(res) {
  res.setHeader('Cache-Control', NO_STORE_HEADER);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function applyWebAssetCacheHeaders(res, filePath) {
  const cacheControl = getCacheControlForFile(filePath);
  res.setHeader('Cache-Control', cacheControl);

  if (cacheControl === NO_STORE_HEADER) {
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}

module.exports = {
  NO_STORE_HEADER,
  getCacheControlForFile,
  setNoStoreHeaders,
  applyWebAssetCacheHeaders,
};
