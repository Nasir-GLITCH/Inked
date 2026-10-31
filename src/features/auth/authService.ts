import { FunctionsFetchError } from '@supabase/supabase-js';

import { failure, toAuthFailure, type AuthFailure } from '@/features/auth/authErrors';
import type { SignInInput, SignUpInput } from '@/features/auth/validation';
import { getSupabase } from '@/services/supabase';

export type AuthResult<T = undefined> = { ok: true; data: T } | { ok: false; failure: AuthFailure };

const OK: AuthResult = { ok: true, data: undefined };

/** Logs only the error's type, never its message or any credentials. */
function logUnexpected(context: string, error: unknown): void {
  const name = error instanceof Error ? error.name : typeof error;
  console.error(`auth: unexpected failure during ${context}`, { name });
}

function fail(context: string, error: unknown): AuthResult<never> {
  const mapped = toAuthFailure(error);
  if (mapped.code === 'unknown') logUnexpected(context, error);
  return { ok: false, failure: mapped };
}

export async function signInWithPassword({ email, password }: SignInInput): Promise<AuthResult> {
  try {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return error ? fail('sign-in', error) : OK;
  } catch (error) {
    return fail('sign-in', error);
  }
}

/**
 * Creates an account. When the project requires email confirmation, Supabase returns
 * no session and the user must confirm before signing in; callers must show that state.
 */
export async function signUpWithPassword({
  name,
  email,
  password,
}: SignUpInput): Promise<AuthResult<{ needsEmailConfirmation: boolean }>> {
  try {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) return fail('sign-up', error);
    return { ok: true, data: { needsEmailConfirmation: data.session === null } };
  } catch (error) {
    return fail('sign-up', error);
  }
}

/** Signs out of this device only; the user's other devices stay signed in. */
export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' });
    return error ? fail('sign-out', error) : OK;
  } catch (error) {
    return fail('sign-out', error);
  }
}

/**
 * Permanently deletes the signed-in user's account via the delete-account edge
 * function (the secret key needed for this never reaches the app), then clears the
 * local session. Only report success once the server confirms the deletion.
 */
export async function deleteAccount(): Promise<AuthResult> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { confirm: true },
    });
    if (error) {
      if (error instanceof FunctionsFetchError) return { ok: false, failure: failure('network') };
      logUnexpected('account deletion', error);
      return { ok: false, failure: failure('unknown') };
    }
    // The account is gone on the server; clearing the local session is best effort.
    await supabase.auth.signOut({ scope: 'local' });
    return OK;
  } catch (error) {
    return fail('account deletion', error);
  }
}
