function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validateEmail(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  if (!email || email.length > 160) {
    return null;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return null;
  }
  return email;
}

function validatePasswordStrength(password: string) {
  const value = String(password ?? '');
  if (value.length < 8) {
    return 'Пароль має містити щонайменше 8 символів.';
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Пароль має містити літери та цифри.';
  }
  return null;
}

function validatePicture(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 400) {
    return 'picture занадто довгий (максимум 400 символів).';
  }
  if (trimmed.startsWith('/')) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'picture має містити URL з http або https.';
    }
    return null;
  } catch {
    return 'picture має бути валідним URL.';
  }
}

export function validateLocalRegistration(payload: {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}) {
  const name = payload.name.trim().slice(0, 120);
  if (!name) {
    return 'Вкажіть імʼя.';
  }

  if (!validateEmail(payload.email)) {
    return 'Вкажіть коректний email.';
  }

  if (payload.password !== payload.passwordConfirm) {
    return 'Паролі не співпадають.';
  }

  return validatePasswordStrength(payload.password);
}

export function validateLocalLogin(payload: { email: string; password: string }) {
  if (!payload.email.trim() || !payload.password) {
    return 'email і password є обовʼязковими.';
  }

  if (!validateEmail(payload.email)) {
    return 'Вкажіть коректний email.';
  }

  return null;
}

export function validateProfileUpdate(payload: { name: string; email: string; picture: string }) {
  const name = payload.name.trim().slice(0, 120);
  if (!name) {
    return 'Імʼя не може бути порожнім.';
  }

  if (!validateEmail(payload.email)) {
    return 'Вкажіть коректний email.';
  }

  return validatePicture(payload.picture);
}

export function validatePasswordChange(payload: { currentPassword: string; newPassword: string }) {
  if (!payload.currentPassword || !payload.newPassword) {
    return 'currentPassword і newPassword є обовʼязковими.';
  }

  return validatePasswordStrength(payload.newPassword);
}

