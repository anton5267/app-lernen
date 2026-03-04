const crypto = require('crypto');

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const PBKDF2_ITERATIONS = 210000;
const DIGEST = 'sha512';

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_BYTES, DIGEST)
    .toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${DIGEST}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const [scheme, iterationsRaw, digest, salt, expectedHash] = storedHash.split('$');
  if (scheme !== 'pbkdf2' || !iterationsRaw || !digest || !salt || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations < 100000) {
    return false;
  }

  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, KEY_BYTES, digest).toString('hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(actualHash, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function validatePasswordStrength(password) {
  const value = String(password ?? '');
  if (value.length < 8) {
    return 'Пароль має містити щонайменше 8 символів.';
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Пароль має містити літери та цифри.';
  }
  return null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
};
