import { PASSWORD_MIN_LENGTH } from '@/features/auth/validation';

export type StrengthLevel = 0 | 1 | 2 | 3;

export type PasswordStrength = {
  /** 0 = unusable or empty, 1 = weak, 2 = good, 3 = strong. Drives the three-bar meter. */
  level: StrengthLevel;
  /** Short human explanation. Empty when nothing has been typed. */
  label: string;
};

function characterVariety(password: string): number {
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/];
  return classes.filter((pattern) => pattern.test(password)).length;
}

/**
 * A simple, explainable length-and-variety estimate. It cannot detect common or
 * leaked passwords, so it is guidance for the user, not a security control; the
 * server enforces the real minimum length.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { level: 0, label: '' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { level: 0, label: `Too short: use at least ${PASSWORD_MIN_LENGTH} characters` };
  }

  const variety = characterVariety(password);
  const { length } = password;

  if (length >= 12 && variety >= 3) {
    return { level: 3, label: 'Strong: 12+ characters with a good mix' };
  }
  if ((length >= 10 && variety >= 2) || variety >= 3) {
    return { level: 2, label: 'Good: a few more characters would make it strong' };
  }
  return { level: 1, label: 'Weak: try a longer password with numbers or symbols' };
}
