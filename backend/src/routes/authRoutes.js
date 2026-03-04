const {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  verifyGoogleIdToken,
  parseSessionToken,
} = require('../auth');
const { hashPassword, verifyPassword, validatePasswordStrength } = require('../password');
const {
  normalizeEmail,
  parseLanguagePreference,
  parseProfilePicture,
  parseThemePreference,
  validateEmail,
} = require('../user');

function registerAuthRoutes({
  app,
  authRequired,
  authLimiter,
  getDb,
  persist,
  createId,
  mapUser,
  toDemoEmail,
  getUserSettingsWithFallback,
}) {
  app.post('/api/auth/google', authLimiter, async (req, res, next) => {
    try {
      const idToken = String(req.body?.idToken ?? '');
      if (!idToken) {
        return res.status(400).json({ error: 'idToken is required' });
      }

      const profile = await verifyGoogleIdToken(idToken);
      const db = getDb();
      const now = new Date().toISOString();
      let user = db.users.find((item) => item.googleSub === profile.googleSub);

      if (!user) {
        user = {
          id: createId(),
          provider: 'google',
          googleSub: profile.googleSub,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          emailVerified: profile.emailVerified,
          passwordHash: null,
          settings: {
            language: 'uk',
            theme: 'system',
            emailNotifications: true,
          },
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        };
        db.users.push(user);
      } else {
        user.provider = 'google';
        user.email = profile.email;
        user.name = profile.name;
        user.picture = profile.picture;
        user.emailVerified = profile.emailVerified;
        user.settings = getUserSettingsWithFallback(user);
        user.passwordHash = typeof user.passwordHash === 'string' ? user.passwordHash : null;
        user.updatedAt = now;
        user.lastLoginAt = now;
      }

      await persist();

      const token = createSessionToken({
        userId: user.id,
        email: user.email,
      });
      setSessionCookie(res, token);
      return res.json({ user: mapUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/register', authLimiter, async (req, res, next) => {
    try {
      const email = validateEmail(req.body?.email);
      const password = String(req.body?.password ?? '');
      const name = String(req.body?.name ?? '').trim().slice(0, 120);

      if (!email) {
        return res.status(400).json({ error: 'Вкажіть коректний email.' });
      }
      if (!name) {
        return res.status(400).json({ error: "Ім'я є обов'язковим." });
      }
      const passwordValidationError = validatePasswordStrength(password);
      if (passwordValidationError) {
        return res.status(400).json({ error: passwordValidationError });
      }

      const db = getDb();
      const existing = db.users.find((item) => normalizeEmail(item.email) === email);
      if (existing) {
        return res.status(409).json({ error: 'Користувач з таким email уже існує.' });
      }

      const now = new Date().toISOString();
      const user = {
        id: createId(),
        provider: 'local',
        googleSub: null,
        email,
        name,
        picture: null,
        emailVerified: false,
        passwordHash: hashPassword(password),
        settings: {
          language: 'uk',
          theme: 'system',
          emailNotifications: true,
        },
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      db.users.push(user);
      await persist();

      const token = createSessionToken({
        userId: user.id,
        email: user.email,
      });
      setSessionCookie(res, token);
      return res.status(201).json({ user: mapUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res, next) => {
    try {
      const email = validateEmail(req.body?.email);
      const password = String(req.body?.password ?? '');
      if (!email || !password) {
        return res.status(400).json({ error: 'email і password є обовʼязковими.' });
      }

      const db = getDb();
      const user = db.users.find((item) => normalizeEmail(item.email) === email);
      if (!user) {
        return res.status(401).json({ error: 'Невірний email або пароль.' });
      }

      if (user.provider !== 'local' || !user.passwordHash) {
        return res.status(400).json({ error: 'Для цього акаунта доступний вхід через Google.' });
      }

      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Невірний email або пароль.' });
      }

      user.updatedAt = new Date().toISOString();
      user.lastLoginAt = user.updatedAt;
      user.settings = getUserSettingsWithFallback(user);
      await persist();

      const token = createSessionToken({
        userId: user.id,
        email: user.email,
      });
      setSessionCookie(res, token);
      return res.json({ user: mapUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/demo', authLimiter, async (req, res, next) => {
    try {
      const providedName = String(req.body?.name ?? '').trim().slice(0, 80);
      const name = providedName || 'Гість';
      const email = toDemoEmail(name);

      const db = getDb();
      const now = new Date().toISOString();
      let user = db.users.find((item) => item.provider === 'demo' && item.email === email);

      if (!user) {
        user = {
          id: createId(),
          provider: 'demo',
          googleSub: null,
          email,
          name,
          picture: null,
          emailVerified: true,
          passwordHash: null,
          settings: {
            language: 'uk',
            theme: 'system',
            emailNotifications: true,
          },
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        };
        db.users.push(user);
      } else {
        user.name = name;
        user.settings = getUserSettingsWithFallback(user);
        user.passwordHash = typeof user.passwordHash === 'string' ? user.passwordHash : null;
        user.updatedAt = now;
        user.lastLoginAt = now;
      }

      await persist();

      const token = createSessionToken({
        userId: user.id,
        email: user.email,
      });
      setSessionCookie(res, token);
      return res.json({ user: mapUser(user), demo: true });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.status(204).send();
  });

  app.post('/api/auth/password/change', authRequired, authLimiter, async (req, res, next) => {
    try {
      const currentPassword = String(req.body?.currentPassword ?? '');
      const newPassword = String(req.body?.newPassword ?? '');
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'currentPassword і newPassword є обовʼязковими.' });
      }

      const passwordValidationError = validatePasswordStrength(newPassword);
      if (passwordValidationError) {
        return res.status(400).json({ error: passwordValidationError });
      }

      const db = getDb();
      const user = db.users.find((item) => item.id === req.auth.userId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (user.provider !== 'local' || !user.passwordHash) {
        return res.status(400).json({ error: 'Зміна паролю доступна лише для локального акаунта.' });
      }
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return res.status(401).json({ error: 'Поточний пароль невірний.' });
      }

      user.passwordHash = hashPassword(newPassword);
      user.updatedAt = new Date().toISOString();
      await persist();
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/me', (req, res) => {
    const payload = parseSessionToken(req.cookies?.session);
    if (!payload?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();
    const user = db.users.find((item) => item.id === payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ user: mapUser(user) });
  });

  app.patch('/api/me/profile', authRequired, async (req, res, next) => {
    try {
      const db = getDb();
      const user = db.users.find((item) => item.id === req.auth.userId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'name')) {
        const name = String(req.body?.name ?? '').trim().slice(0, 120);
        if (!name) {
          return res.status(400).json({ error: "Ім'я не може бути порожнім." });
        }
        user.name = name;
      }

      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'picture')) {
        const picture = parseProfilePicture(req.body?.picture);
        if (!picture.ok) {
          return res.status(400).json({ error: picture.error });
        }
        user.picture = picture.value;
      }

      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'email')) {
        const nextEmail = validateEmail(req.body?.email);
        if (!nextEmail) {
          return res.status(400).json({ error: 'Вкажіть коректний email.' });
        }

        const alreadyTaken = db.users.some(
          (item) => item.id !== user.id && normalizeEmail(item.email) === nextEmail
        );
        if (alreadyTaken) {
          return res.status(409).json({ error: 'Користувач з таким email уже існує.' });
        }
        user.email = nextEmail;
      }

      user.updatedAt = new Date().toISOString();
      user.settings = getUserSettingsWithFallback(user);
      await persist();

      const token = createSessionToken({
        userId: user.id,
        email: user.email,
      });
      setSessionCookie(res, token);
      return res.json({ user: mapUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/settings', authRequired, (req, res) => {
    const db = getDb();
    const user = db.users.find((item) => item.id === req.auth.userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ settings: getUserSettingsWithFallback(user) });
  });

  app.patch('/api/settings', authRequired, async (req, res, next) => {
    try {
      const db = getDb();
      const user = db.users.find((item) => item.id === req.auth.userId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const nextSettings = getUserSettingsWithFallback(user);

      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'language')) {
        const language = parseLanguagePreference(req.body?.language);
        if (!language) {
          return res.status(400).json({ error: "language має бути 'uk' або 'en'." });
        }
        nextSettings.language = language;
      }

      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'theme')) {
        const theme = parseThemePreference(req.body?.theme);
        if (!theme) {
          return res.status(400).json({ error: "theme має бути 'system'|'light'|'dark'|'warm'." });
        }
        nextSettings.theme = theme;
      }

      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'emailNotifications')) {
        if (typeof req.body?.emailNotifications !== 'boolean') {
          return res.status(400).json({ error: 'emailNotifications має бути boolean.' });
        }
        nextSettings.emailNotifications = req.body.emailNotifications;
      }

      user.settings = nextSettings;
      user.updatedAt = new Date().toISOString();
      await persist();
      return res.json({ settings: nextSettings, user: mapUser(user) });
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = {
  registerAuthRoutes,
};
