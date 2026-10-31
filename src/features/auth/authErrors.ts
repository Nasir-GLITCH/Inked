import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

export type AuthFailureCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'email_taken'
  | 'weak_password'
  | 'rate_limited'
  | 'signup_disabled'
  | 'network'
  | 'unknown';

export type AuthFailure = { code: AuthFailureCode; message: string };

const MESSAGES: Record<AuthFailureCode, string> = {
  invalid_credentials: 'The email or password is incorrect.',
  email_not_confirmed: 'Confirm your email address first. Check your inbox for the link we sent.',
  email_taken: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'Choose a stronger password.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  signup_disabled: 'New sign-ups are not available right now.',
  network: 'Cannot reach the server. Check your connection and try again.',
  unknown: 'Something went wrong. Please try again.',
};

const API_CODE_MAP: Record<string, AuthFailureCode> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_already_exists: 'email_taken',
  email_exists: 'email_taken',
  weak_password: 'weak_password',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  signup_disabled: 'signup_disabled',
};

export function failure(code: AuthFailureCode): AuthFailure {
  return { code, message: MESSAGES[code] };
}

/**
 * Converts any error from Supabase into a safe, user-facing failure. Raw server
 * messages are never shown, so internals are not leaked and wording stays consistent.
 */
export function toAuthFailure(error: unknown): AuthFailure {
  if (isAuthRetryableFetchError(error)) {
    return failure('network');
  }
  if (isAuthApiError(error)) {
    if (error.status === 429) return failure('rate_limited');
    const mapped = error.code ? API_CODE_MAP[error.code] : undefined;
    return failure(mapped ?? 'unknown');
  }
  return failure('unknown');
}
