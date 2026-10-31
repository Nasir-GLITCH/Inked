import { getPasswordStrength } from '@/features/auth/passwordStrength';

describe('getPasswordStrength', () => {
  it('returns level 0 with no label for an empty password', () => {
    expect(getPasswordStrength('')).toEqual({ level: 0, label: '' });
  });

  it('flags anything under 8 characters as too short', () => {
    const result = getPasswordStrength('Ab1!xyz');
    expect(result.level).toBe(0);
    expect(result.label).toMatch(/at least 8/);
  });

  it('rates an 8-character single-class password as weak', () => {
    expect(getPasswordStrength('abcdefgh').level).toBe(1);
  });

  it('rates 8 characters with three character classes as good', () => {
    expect(getPasswordStrength('Abcdef1!').level).toBe(2);
  });

  it('rates 10+ characters with two classes as good', () => {
    expect(getPasswordStrength('abcdefgh12').level).toBe(2);
  });

  it('rates 12+ characters with three classes as strong', () => {
    expect(getPasswordStrength('Correct-horse-9')).toMatchObject({ level: 3 });
  });

  it('does not rate a long single-class password as strong', () => {
    expect(getPasswordStrength('a'.repeat(30)).level).toBeLessThan(3);
  });

  it('counts symbols and non-ASCII characters as a class', () => {
    expect(getPasswordStrength('abcdefgh日本語日本語').level).toBeGreaterThanOrEqual(2);
  });

  it('is monotonic: appending characters never lowers the level', () => {
    let previous = 0;
    let password = '';
    for (const char of 'Tr0ub4dor&3-horse-staple') {
      password += char;
      const { level } = getPasswordStrength(password);
      if (password.length >= 8) {
        expect(level).toBeGreaterThanOrEqual(previous);
        previous = level;
      }
    }
  });
});
