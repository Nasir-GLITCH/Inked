import { useCallback, useEffect, useState } from 'react';

import { fetchProfile, type Profile } from '@/features/profile/profileService';

export type ProfileState =
  { status: 'loading' } | { status: 'ready'; profile: Profile } | { status: 'error' };

/** Loads the profile once on mount and exposes a retry for the error state. */
export function useProfile() {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchProfile().then((result) => {
      if (!active) return;
      setState(result.ok ? { status: 'ready', profile: result.data } : { status: 'error' });
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
