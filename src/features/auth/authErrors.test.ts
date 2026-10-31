import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { failure, toAuthFailure } from '@/features/auth/authErrors';

describe('toAuthFailure', () => {
  it.each([
    ['invalid_credentials', 400, 'invalid_credentials'],
    ['email_not_confirmed', 400, 'email_not_confirmed'],
    ['user_already_exists', 422, 'email_taken'],
    ['email_exists', 422, 'email_taken'],
    ['weak_password', 422, 'weak_password'],
    ['over_request_rate_limit', 429, 'rate_limited'],
    ['over_email_send_rate_limit', 429, 'rate_limited'],
    ['signup_disabled', 422, 'signup_disabled'],
  ] as const)('maps API code %s (HTTP %i) to %s', (apiCode, status, expected) => {
    const error = new AuthApiError('raw server text', status, apiCode);
    expect(toAuthFailure(error)).toEqual(failure(expected));
  });

  it('treats any HTTP 429 as rate limited, even with an unfamiliar code', () => {
    expect(toAuthFailure(new AuthApiError('x', 429, 'something_new')).code).toBe('rate_limited');
  });

  it('maps an unrecognised API code to unknown', () => {
    expect(toAuthFailure(new AuthApiError('x', 500, 'mystery')).code).toBe('unknown');
  });

  it('maps an API error with no code to unknown', () => {
    expect(toAuthFailure(new AuthApiError('x', 500, undefined)).code).toBe('unknown');
  });

  it('maps connectivity failures to network', () => {
    expect(toAuthFailure(new AuthRetryableFetchError('Failed to fetch', 0)).code).toBe('network');
  });

  it.each([new Error('boom'), 'a string', null, undefined, 42])(
    'maps non-Supabase value %p to unknown without throwing',
    (value) => {
      expect(toAuthFailure(value).code).toBe('unknown');
    },
  );

  it('never exposes the raw server message to the user', () => {
    const error = new AuthApiError(
      'internal stack: db password=hunter2',
      500,
      'unexpected_failure',
    );
    expect(toAuthFailure(error).message).not.toMatch(/hunter2|internal|stack/);
  });

  it('gives every failure code a non-empty, distinct-enough message', () => {
    const codes = [
      'invalid_credentials',
      'email_not_confirmed',
      'email_taken',
      'weak_password',
      'rate_limited',
      'signup_disabled',
      'network',
      'unknown',
    ] as const;
    const messages = codes.map((code) => failure(code).message);
    expect(messages.every((message) => message.length > 10)).toBe(true);
    expect(new Set(messages).size).toBe(codes.length);
  });
});
