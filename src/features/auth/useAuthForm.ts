import { useRef, useState } from 'react';

import {
  signInWithPassword,
  signUpWithPassword,
  type AuthResult,
} from '@/features/auth/authService';
import { validateSignIn, validateSignUp } from '@/features/auth/validation';

export type AuthMode = 'signIn' | 'signUp';
export type AuthField = 'name' | 'email' | 'password';

type Values = Record<AuthField, string>;
type FieldErrors = Partial<Record<AuthField, string>>;

const EMPTY_VALUES: Values = { name: '', email: '', password: '' };

const CONFIRM_EMAIL_NOTICE =
  'Account created. Open the confirmation link we emailed you, then sign in here.';

/**
 * State and submit logic for the Sign In / Create Account screen. Success is not
 * handled here: when a session starts, the root route guard moves the user into the
 * app. The hook only reports problems and the "confirm your email" state.
 */
export function useAuthForm(initialMode: AuthMode = 'signIn') {
  const [mode, setModeState] = useState<AuthMode>(initialMode);
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  // State updates are asynchronous, so a ref is what actually blocks a fast double tap.
  const inFlight = useRef(false);

  function setValue(field: AuthField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  }

  function setMode(next: AuthMode) {
    if (inFlight.current) return;
    setModeState(next);
    setFieldErrors({});
    setFormError(undefined);
    setNotice(undefined);
  }

  /** Runs one request with the busy state, duplicate-submit guard and error message handling. */
  async function runSubmission<T>(request: () => Promise<AuthResult<T>>) {
    inFlight.current = true;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(undefined);
    setNotice(undefined);
    try {
      const result = await request();
      if (!result.ok) setFormError(result.failure.message);
      return result;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  async function submit() {
    if (inFlight.current) return;

    if (mode === 'signIn') {
      const parsed = validateSignIn(values);
      if (!parsed.ok) {
        setFieldErrors(parsed.errors);
        return;
      }
      await runSubmission(() => signInWithPassword(parsed.data));
      return;
    }

    const parsed = validateSignUp(values);
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      return;
    }
    const result = await runSubmission(() => signUpWithPassword(parsed.data));
    if (result.ok && result.data.needsEmailConfirmation) {
      setModeState('signIn');
      setValues((current) => ({ ...EMPTY_VALUES, email: current.email }));
      setNotice(CONFIRM_EMAIL_NOTICE);
    }
  }

  return { mode, setMode, values, setValue, fieldErrors, formError, notice, submitting, submit };
}
