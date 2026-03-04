function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 160) {
    return null;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return null;
  }

  return email;
}

function normalizeUserProvider(value) {
  if (value === 'local' || value === 'google' || value === 'demo') {
    return value;
  }
  return 'demo';
}

function parseThemePreference(value) {
  if (value === 'light' || value === 'dark' || value === 'warm' || value === 'system') {
    return value;
  }
  return null;
}

function parseLanguagePreference(value) {
  if (value === 'uk' || value === 'en') {
    return value;
  }
  return null;
}

function normalizeUserSettings(rawSettings) {
  const settings = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  return {
    language: settings.language === 'en' ? 'en' : 'uk',
    theme:
      settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'warm'
        ? settings.theme
        : 'system',
    emailNotifications:
      typeof settings.emailNotifications === 'boolean' ? settings.emailNotifications : true,
  };
}

function mapUserForApi(user, admins = []) {
  const email = normalizeEmail(user?.email);
  return {
    id: user?.id,
    email,
    name: user?.name,
    picture: user?.picture ?? null,
    provider: normalizeUserProvider(user?.provider),
    isAdmin: Boolean(email && admins.includes(email)),
    settings: normalizeUserSettings(user?.settings),
  };
}

function parseProfilePicture(value) {
  if (value === null || value === '') {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string') {
    return { ok: false, error: 'picture має бути string або null.' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (trimmed.length > 400) {
    return { ok: false, error: 'picture занадто довгий (максимум 400 символів).' };
  }

  if (trimmed.startsWith('/')) {
    return { ok: true, value: trimmed };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'picture має містити URL з http або https.' };
    }
    return { ok: true, value: trimmed };
  } catch {
    return { ok: false, error: 'picture має бути валідним URL.' };
  }
}

module.exports = {
  normalizeEmail,
  validateEmail,
  normalizeUserProvider,
  parseThemePreference,
  parseLanguagePreference,
  normalizeUserSettings,
  mapUserForApi,
  parseProfilePicture,
};
