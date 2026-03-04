const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { googleClientId, jwtSecret, jwtExpiresIn, nodeEnv } = require('./config');

const authClient = new OAuth2Client(googleClientId || undefined);

function createSessionToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

function parseSessionToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function clearSessionCookie(res) {
  res.clearCookie('session');
}

async function verifyGoogleIdToken(idToken) {
  if (!googleClientId) {
    const error = new Error('GOOGLE_CLIENT_ID is not configured');
    error.status = 500;
    throw error;
  }

  let ticket;
  try {
    ticket = await authClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
  } catch (cause) {
    const error = new Error(
      'Google ID token validation failed. Check Google OAuth Client ID and Authorized JavaScript origins.'
    );
    error.status = 401;
    error.cause = cause;
    throw error;
  }

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    const error = new Error('Invalid Google token payload');
    error.status = 401;
    throw error;
  }

  return {
    googleSub: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    picture: payload.picture ?? null,
    emailVerified: Boolean(payload.email_verified),
  };
}

function authRequired(req, res, next) {
  const token = req.cookies?.session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = parseSessionToken(token);
  if (!payload?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.auth = payload;
  return next();
}

module.exports = {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  verifyGoogleIdToken,
  parseSessionToken,
  authRequired,
};
