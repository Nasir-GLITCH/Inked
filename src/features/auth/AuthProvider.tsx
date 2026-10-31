import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { getSupabase } from '@/services/supabase';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthUser = { id: string; email: string | null };

type AuthState = { status: AuthStatus; user: AuthUser | null };

const AuthContext = createContext<AuthState | undefined>(undefined);

function stateFromSession(session: Session | null): AuthState {
  if (!session) return { status: 'signedOut', user: null };
  return { status: 'signedIn', user: { id: session.user.id, email: session.user.email ?? null } };
}

/**
 * Restores the stored session at launch and keeps auth state in sync with Supabase
 * (sign-in, sign-out, expired or revoked sessions). The route guard reads this state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    // Do not call other Supabase methods inside this callback (it can deadlock the client).
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(stateFromSession(session));
    });

    supabase.auth
      .getSession()
      .then(({ data: sessionData }) => {
        if (active) setState(stateFromSession(sessionData.session));
      })
      .catch(() => {
        // Unreadable storage or a failed refresh must not leave the app stuck on the splash.
        if (active) setState(stateFromSession(null));
      });

    // Tokens refresh only while the app is in the foreground.
    const applyAppState = (appState: string) => {
      if (appState === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    applyAppState(AppState.currentState ?? 'active');
    const appStateSubscription = AppState.addEventListener('change', applyAppState);

    return () => {
      active = false;
      data.subscription.unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}
