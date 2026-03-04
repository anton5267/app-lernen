const {
  mapUserForApi,
  normalizeEmail,
  normalizeUserProvider,
  normalizeUserSettings,
  parseLanguagePreference,
  parseProfilePicture,
  parseThemePreference,
  validateEmail,
} = require('../src/user');

describe('user helpers', () => {
  it('normalizes email and validates format', () => {
    expect(normalizeEmail('  USER@Example.COM ')).toBe('user@example.com');
    expect(validateEmail('valid@example.com')).toBe('valid@example.com');
    expect(validateEmail('invalid')).toBeNull();
  });

  it('normalizes provider and settings with safe defaults', () => {
    expect(normalizeUserProvider('local')).toBe('local');
    expect(normalizeUserProvider('unknown')).toBe('demo');

    expect(
      normalizeUserSettings({
        language: 'en',
        theme: 'dark',
        emailNotifications: false,
      })
    ).toEqual({
      language: 'en',
      theme: 'dark',
      emailNotifications: false,
    });

    expect(normalizeUserSettings({})).toEqual({
      language: 'uk',
      theme: 'system',
      emailNotifications: true,
    });
  });

  it('parses preferences and profile picture input', () => {
    expect(parseLanguagePreference('uk')).toBe('uk');
    expect(parseLanguagePreference('de')).toBeNull();

    expect(parseThemePreference('warm')).toBe('warm');
    expect(parseThemePreference('blue')).toBeNull();

    expect(parseProfilePicture('https://example.com/avatar.png')).toEqual({
      ok: true,
      value: 'https://example.com/avatar.png',
    });
    expect(parseProfilePicture('/uploads/avatar.png')).toEqual({
      ok: true,
      value: '/uploads/avatar.png',
    });
    expect(parseProfilePicture('javascript:alert(1)')).toMatchObject({
      ok: false,
      error: expect.stringContaining('http або https'),
    });
  });

  it('maps user for api payload with admin flag', () => {
    const mapped = mapUserForApi(
      {
        id: 'u1',
        email: 'Admin.User@Example.com',
        name: 'Admin',
        picture: null,
        provider: 'local',
        settings: {
          language: 'en',
          theme: 'dark',
          emailNotifications: false,
        },
      },
      ['admin.user@example.com']
    );

    expect(mapped).toEqual({
      id: 'u1',
      email: 'admin.user@example.com',
      name: 'Admin',
      picture: null,
      provider: 'local',
      isAdmin: true,
      settings: {
        language: 'en',
        theme: 'dark',
        emailNotifications: false,
      },
    });
  });
});
