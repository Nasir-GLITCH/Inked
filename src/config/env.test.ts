import { ConfigError, parseEnv, parseLegalLinks } from '@/config/env';

const VALID = {
  supabaseUrl: 'https://abcd.supabase.co',
  supabasePublishableKey: 'sb_publishable_0123456789abcdef',
};

describe('parseEnv', () => {
  it('accepts a valid configuration', () => {
    expect(parseEnv(VALID)).toEqual(VALID);
  });

  it.each([
    ['missing url', { ...VALID, supabaseUrl: undefined }, 'supabaseUrl'],
    ['empty url', { ...VALID, supabaseUrl: '' }, 'supabaseUrl'],
    ['not a url', { ...VALID, supabaseUrl: 'abcd.supabase.co' }, 'supabaseUrl'],
    ['plain http', { ...VALID, supabaseUrl: 'http://abcd.supabase.co' }, 'supabaseUrl'],
    ['missing key', { ...VALID, supabasePublishableKey: undefined }, 'supabasePublishableKey'],
    ['too-short key', { ...VALID, supabasePublishableKey: 'short' }, 'supabasePublishableKey'],
  ])('rejects %s and names the bad setting', (_label, raw, field) => {
    expect(() => parseEnv(raw)).toThrow(ConfigError);
    expect(() => parseEnv(raw)).toThrow(field);
  });

  it('never includes the offending value in the error message', () => {
    const secretLooking = 'http://leaky.example/with-secret-token-123';
    expect(() => parseEnv({ ...VALID, supabaseUrl: secretLooking })).not.toThrow(
      /secret-token-123/,
    );
  });
});

describe('parseLegalLinks', () => {
  it('returns undefined links when not configured', () => {
    expect(parseLegalLinks({ privacyPolicyUrl: undefined, termsUrl: undefined })).toEqual({
      privacyPolicyUrl: undefined,
      termsUrl: undefined,
    });
  });

  it('treats empty strings as not configured', () => {
    expect(parseLegalLinks({ privacyPolicyUrl: '', termsUrl: '' })).toEqual({
      privacyPolicyUrl: undefined,
      termsUrl: undefined,
    });
  });

  it('returns valid links and drops malformed ones without throwing', () => {
    expect(
      parseLegalLinks({ privacyPolicyUrl: 'https://inked.example/privacy', termsUrl: 'not a url' }),
    ).toEqual({ privacyPolicyUrl: 'https://inked.example/privacy', termsUrl: undefined });
  });
});
