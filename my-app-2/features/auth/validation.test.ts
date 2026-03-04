import {
  validateLocalLogin,
  validateLocalRegistration,
  validatePasswordChange,
  validateProfileUpdate,
} from './validation';

describe('auth validation', () => {
  it('validates local registration with backend-compatible rules', () => {
    expect(
      validateLocalRegistration({
        name: '',
        email: 'user@example.com',
        password: 'Password1',
        passwordConfirm: 'Password1',
      })
    ).toBe('Вкажіть імʼя.');

    expect(
      validateLocalRegistration({
        name: 'User',
        email: 'invalid',
        password: 'Password1',
        passwordConfirm: 'Password1',
      })
    ).toBe('Вкажіть коректний email.');

    expect(
      validateLocalRegistration({
        name: 'User',
        email: 'user@example.com',
        password: 'Password1',
        passwordConfirm: 'Password2',
      })
    ).toBe('Паролі не співпадають.');

    expect(
      validateLocalRegistration({
        name: 'User',
        email: 'user@example.com',
        password: 'short7',
        passwordConfirm: 'short7',
      })
    ).toBe('Пароль має містити щонайменше 8 символів.');

    expect(
      validateLocalRegistration({
        name: 'User',
        email: 'user@example.com',
        password: 'passwordonly',
        passwordConfirm: 'passwordonly',
      })
    ).toBe('Пароль має містити літери та цифри.');

    expect(
      validateLocalRegistration({
        name: 'User',
        email: 'user@example.com',
        password: 'Password1',
        passwordConfirm: 'Password1',
      })
    ).toBeNull();
  });

  it('validates local login payload', () => {
    expect(validateLocalLogin({ email: '', password: '' })).toBe('email і password є обовʼязковими.');
    expect(validateLocalLogin({ email: 'bad', password: 'test' })).toBe('Вкажіть коректний email.');
    expect(validateLocalLogin({ email: 'user@example.com', password: 'test' })).toBeNull();
  });

  it('validates profile update fields including avatar URL', () => {
    expect(validateProfileUpdate({ name: '', email: 'user@example.com', picture: '' })).toBe(
      'Імʼя не може бути порожнім.'
    );
    expect(validateProfileUpdate({ name: 'User', email: 'bad', picture: '' })).toBe(
      'Вкажіть коректний email.'
    );
    expect(validateProfileUpdate({ name: 'User', email: 'user@example.com', picture: 'ftp://avatar' })).toBe(
      'picture має містити URL з http або https.'
    );
    expect(validateProfileUpdate({ name: 'User', email: 'user@example.com', picture: '/uploads/avatar.png' })).toBeNull();
    expect(validateProfileUpdate({ name: 'User', email: 'user@example.com', picture: 'https://example.com/a.png' })).toBeNull();
  });

  it('validates password change payload', () => {
    expect(validatePasswordChange({ currentPassword: '', newPassword: '' })).toBe(
      'currentPassword і newPassword є обовʼязковими.'
    );
    expect(validatePasswordChange({ currentPassword: 'Current123', newPassword: 'short' })).toBe(
      'Пароль має містити щонайменше 8 символів.'
    );
    expect(validatePasswordChange({ currentPassword: 'Current123', newPassword: 'NewPassword1' })).toBeNull();
  });
});

