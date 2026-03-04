const {
  NO_STORE_HEADER,
  applyWebAssetCacheHeaders,
  getCacheControlForFile,
  setNoStoreHeaders,
} = require('../src/cacheHeaders');

function createMockResponse() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
  };
}

describe('cache headers helpers', () => {
  it('returns no-store for html files', () => {
    expect(getCacheControlForFile('index.html')).toBe(NO_STORE_HEADER);
  });

  it('returns immutable cache for static assets', () => {
    expect(getCacheControlForFile('entry-abc123.js')).toBe('public, max-age=31536000, immutable');
    expect(getCacheControlForFile('styles.css')).toBe('public, max-age=31536000, immutable');
    expect(getCacheControlForFile('font.woff2')).toBe('public, max-age=31536000, immutable');
  });

  it('returns short cache for unknown file types', () => {
    expect(getCacheControlForFile('readme.txt')).toBe('public, max-age=300');
  });

  it('sets no-store header bundle for api payloads', () => {
    const res = createMockResponse();
    setNoStoreHeaders(res);

    expect(res.headers['cache-control']).toBe(NO_STORE_HEADER);
    expect(res.headers.pragma).toBe('no-cache');
    expect(res.headers.expires).toBe('0');
  });

  it('applies cache headers for static assets', () => {
    const res = createMockResponse();
    applyWebAssetCacheHeaders(res, '/dist/_expo/static/js/web/entry-hash.js');

    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers.pragma).toBeUndefined();
    expect(res.headers.expires).toBeUndefined();
  });

  it('applies no-store extras for html files', () => {
    const res = createMockResponse();
    applyWebAssetCacheHeaders(res, '/dist/index.html');

    expect(res.headers['cache-control']).toBe(NO_STORE_HEADER);
    expect(res.headers.pragma).toBe('no-cache');
    expect(res.headers.expires).toBe('0');
  });
});
