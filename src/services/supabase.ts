import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getEnv } from '@/config/env';
import type { Database } from '@/services/database.types';
import { secureSessionStorage } from '@/services/secureSessionStorage';

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | undefined;

/**
 * The single Supabase client. Created on first use so that a missing configuration
 * surfaces as a clear ConfigError instead of crashing at import time.
 * Only the publishable key is used here; access control is enforced by RLS.
 */
export function getSupabase(): AppSupabaseClient {
  client ??= createClient<Database>(getEnv().supabaseUrl, getEnv().supabasePublishableKey, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
