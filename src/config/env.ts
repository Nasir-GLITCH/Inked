import { z } from 'zod';

/**
 * App configuration read from EXPO_PUBLIC_* variables.
 *
 * Every EXPO_PUBLIC_* value is bundled into the app and readable by anyone who
 * installs it, so only values that are safe to publish belong here (the Supabase
 * URL and the *publishable* key). Never put a secret/service-role key in this app.
 */

const optionalUrl = z.preprocess((value) => (value === '' ? undefined : value), z.url().optional());

const envSchema = z.object({
  supabaseUrl: z.url().refine((url) => url.startsWith('https://'), { message: 'must use https' }),
  supabasePublishableKey: z.string().min(20),
});

export type AppEnv = z.infer<typeof envSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/** Validates raw values. Reports which settings are wrong, never their values. */
export function parseEnv(raw: { supabaseUrl: unknown; supabasePublishableKey: unknown }): AppEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new ConfigError(
      `Invalid app configuration (${fields.join(', ')}). Copy .env.example to .env and fill in the values.`,
    );
  }
  return result.data;
}

let cachedEnv: AppEnv | undefined;

/** Required configuration. Throws ConfigError when it is missing or malformed. */
export function getEnv(): AppEnv {
  // Expo only inlines EXPO_PUBLIC_* variables that are written out in full like this.
  cachedEnv ??= parseEnv({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cachedEnv;
}

export type LegalLinks = { privacyPolicyUrl?: string; termsUrl?: string };

/**
 * Validates optional legal links. Unlike parseEnv this never throws: a missing or
 * malformed link becomes undefined, so the UI shows plain text instead of a link
 * that goes nowhere.
 */
export function parseLegalLinks(raw: { privacyPolicyUrl: unknown; termsUrl: unknown }): LegalLinks {
  const privacy = optionalUrl.safeParse(raw.privacyPolicyUrl);
  const terms = optionalUrl.safeParse(raw.termsUrl);
  return {
    privacyPolicyUrl: privacy.success ? (privacy.data as string | undefined) : undefined,
    termsUrl: terms.success ? (terms.data as string | undefined) : undefined,
  };
}

export function getLegalLinks(): LegalLinks {
  return parseLegalLinks({
    privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
    termsUrl: process.env.EXPO_PUBLIC_TERMS_URL,
  });
}
