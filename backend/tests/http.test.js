const { buildCorsOptions, createRateLimiters } = require('../src/http');

describe('http helpers', () => {
  it('builds cors options with explicit allow-list', (done) => {
    const options = buildCorsOptions(['http://localhost:19007']);

    options.origin('http://localhost:19007', (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
    });

    options.origin('https://example.com', (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(false);
      done();
    });
  });

  it('allows all origins when wildcard is configured', (done) => {
    const options = buildCorsOptions(['*']);
    options.origin('https://any-origin.com', (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  it('creates all expected rate limiters', () => {
    const limiters = createRateLimiters({
      rateLimitWindowMs: 60_000,
      rateLimitMax: 10,
      authRateLimitMax: 5,
      uploadRateLimitMax: 3,
      shareCreateRateLimitMax: 2,
    });

    expect(typeof limiters.apiLimiter).toBe('function');
    expect(typeof limiters.authLimiter).toBe('function');
    expect(typeof limiters.uploadLimiter).toBe('function');
    expect(typeof limiters.shareCreateLimiter).toBe('function');
  });
});
