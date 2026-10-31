import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateSignIn,
  validateSignUp,
} from '@/features/auth/validation';

describe('validateSignIn', () => {
  it('accepts valid input and normalises the email', () => {
    const result = validateSignIn({ email: '  Alex@Example.COM ', password: 'whatever' });
    expect(result).toEqual({ ok: true, data: { email: 'alex@example.com', password: 'whatever' } });
  });

  it('does not alter or trim the password', () => {
    const result = validateSignIn({ email: 'a@b.co', password: '  spaced  ' });
    expect(result.ok && result.data.password).toBe('  spaced  ');
  });

  it('reports both fields when empty', () => {
    expect(validateSignIn({ email: '', password: '' })).toEqual({
      ok: false,
      errors: { email: 'Enter your email address.', password: 'Enter your password.' },
    });
  });

  it('treats a whitespace-only email as empty', () => {
    const result = validateSignIn({ email: '   ', password: 'x' });
    expect(!result.ok && result.errors.email).toBe('Enter your email address.');
  });

  it.each(['plainaddress', 'missing@tld', '@no-local.com', 'two@@at.com'])(
    'rejects malformed email %s',
    (email) => {
      const result = validateSignIn({ email, password: 'x' });
      expect(!result.ok && result.errors.email).toBe('Enter a valid email address.');
    },
  );

  it('rejects missing fields instead of throwing', () => {
    expect(validateSignIn({}).ok).toBe(false);
    expect(validateSignIn(null).ok).toBe(false);
    expect(validateSignIn(undefined).ok).toBe(false);
  });
});

describe('validateSignUp', () => {
  const valid = { name: 'Alex Sterling', email: 'alex@example.com', password: 'correct-horse-9' };

  it('accepts valid input and trims the name', () => {
    expect(validateSignUp({ ...valid, name: '  Alex Sterling ' })).toEqual({
      ok: true,
      data: valid,
    });
  });

  it('requires a name', () => {
    const result = validateSignUp({ ...valid, name: '   ' });
    expect(!result.ok && result.errors.name).toBe('Enter your name.');
  });

  it('accepts a name of exactly the maximum length and rejects one more', () => {
    expect(validateSignUp({ ...valid, name: 'x'.repeat(NAME_MAX_LENGTH) }).ok).toBe(true);
    const result = validateSignUp({ ...valid, name: 'x'.repeat(NAME_MAX_LENGTH + 1) });
    expect(!result.ok && result.errors.name).toMatch(/80 characters or fewer/);
  });

  it('enforces the minimum password length at the boundary', () => {
    expect(validateSignUp({ ...valid, password: 'a'.repeat(PASSWORD_MIN_LENGTH) }).ok).toBe(true);
    const result = validateSignUp({ ...valid, password: 'a'.repeat(PASSWORD_MIN_LENGTH - 1) });
    expect(!result.ok && result.errors.password).toMatch(/at least 8/);
  });

  it('enforces the 72-byte password maximum in bytes, not characters', () => {
    expect(validateSignUp({ ...valid, password: 'a'.repeat(PASSWORD_MAX_LENGTH) }).ok).toBe(true);
    expect(validateSignUp({ ...valid, password: 'a'.repeat(PASSWORD_MAX_LENGTH + 1) }).ok).toBe(
      false,
    );
    // 25 three-byte characters = 75 bytes but only 25 characters.
    const result = validateSignUp({ ...valid, password: '日'.repeat(25) });
    expect(!result.ok && result.errors.password).toMatch(/72 bytes/);
  });

  it('reports every invalid field at once', () => {
    const result = validateSignUp({ name: '', email: 'nope', password: 'short' });
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['email', 'name', 'password']);
  });
});
