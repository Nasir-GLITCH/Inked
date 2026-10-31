import { getSupabase } from '@/services/supabase';

export type Plan = 'free' | 'pro';

export type Profile = { displayName: string | null; plan: Plan };

export type ProfileResult = { ok: true; data: Profile } | { ok: false };

/**
 * Loads the signed-in user's own profile row. Row Level Security guarantees the query
 * can only ever return that user's row, so no user id is sent from the client.
 */
export async function fetchProfile(): Promise<ProfileResult> {
  try {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('display_name, plan')
      .maybeSingle();

    if (error || !data) return { ok: false };
    return {
      ok: true,
      data: { displayName: data.display_name, plan: data.plan === 'pro' ? 'pro' : 'free' },
    };
  } catch (error) {
    console.error('profile: unexpected failure while loading', {
      name: error instanceof Error ? error.name : typeof error,
    });
    return { ok: false };
  }
}
