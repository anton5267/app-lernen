const rateLimit = require('express-rate-limit');

function createRateLimiter(windowMs, max, errorMessage) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: errorMessage },
  });
}

function createRateLimiters({
  rateLimitWindowMs,
  rateLimitMax,
  authRateLimitMax,
  uploadRateLimitMax,
  shareCreateRateLimitMax,
}) {
  return {
    apiLimiter: createRateLimiter(rateLimitWindowMs, rateLimitMax, 'Too many requests. Please try again later.'),
    authLimiter: createRateLimiter(
      rateLimitWindowMs,
      authRateLimitMax,
      'Too many auth attempts. Please try again later.'
    ),
    uploadLimiter: createRateLimiter(
      rateLimitWindowMs,
      uploadRateLimitMax,
      'Too many uploads. Please try again later.'
    ),
    shareCreateLimiter: createRateLimiter(
      rateLimitWindowMs,
      shareCreateRateLimitMax,
      'Too many share link creations. Please try again later.'
    ),
  };
}

function buildCorsOptions(frontendOrigins) {
  const allowAllOrigins = frontendOrigins.includes('*');
  const allowedOrigins = new Set(frontendOrigins);

  return {
    origin(origin, callback) {
      if (allowAllOrigins || !origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  };
}

module.exports = {
  buildCorsOptions,
  createRateLimiters,
};
