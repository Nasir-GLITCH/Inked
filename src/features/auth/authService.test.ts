import {
  AuthApiError,
  AuthRetryableFetchError,
  FunctionsFetchError,
  FunctionsHttpError,
} from '@supabase/supabase-js';

import {
  deleteAccount,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '@/features/auth/authService';

const mockAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};
const mockInvoke = jest.fn();

jest.mock('@/services/supabase', () => ({
  getSupabase: () => ({ auth: mockAuth, functions: { invoke: mockInvoke } }),
}));

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('signInWithPassword', () => {
  it('passes credentials through and reports success', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });

    const result = await signInWithPassword({ email: 'a@b.co', password: 'pw' });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' });
  });

  it('maps wrong credentials to a friendly failure', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    });

    const result = await signInWithPassword({ email: 'a@b.co', password: 'bad' });

    expect(result).toMatchObject({ ok: false, failure: { code: 'invalid_credentials' } });
  });

  it('reports a network failure', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });
    const result = await signInWithPassword({ email: 'a@b.co', password: 'pw' });
    expect(result).toMatchObject({ ok: false, failure: { code: 'network' } });
  });

  it('converts a thrown error into a failure instead of rejecting', async () => {
    mockAuth.signInWithPassword.mockRejectedValue(new Error('boom'));
    const result = await signInWithPassword({ email: 'a@b.co', password: 'pw' });
    expect(result).toMatchObject({ ok: false, failure: { code: 'unknown' } });
  });

  it('never logs the password or email', async () => {
    mockAuth.signInWithPassword.mockRejectedValue(new Error('boom'));
    await signInWithPassword({ email: 'secret@user.co', password: 'hunter2hunter2' });

    const logged = JSON.stringify((console.error as jest.Mock).mock.calls);
    expect(logged).not.toMatch(/hunter2|secret@user/);
  });
});

describe('signUpWithPassword', () => {
  const input = { name: 'Alex', email: 'a@b.co', password: 'correct-horse-9' };

  it('sends the name as profile metadata', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });

    await signUpWithPassword(input);

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'correct-horse-9',
      options: { data: { full_name: 'Alex' } },
    });
  });

  it('signals no confirmation needed when a session is returned', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    expect(await signUpWithPassword(input)).toEqual({
      ok: true,
      data: { needsEmailConfirmation: false },
    });
  });

  it('signals confirmation needed when no session is returned', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null });
    expect(await signUpWithPassword(input)).toEqual({
      ok: true,
      data: { needsEmailConfirmation: true },
    });
  });

  it('maps an existing email to email_taken', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: {},
      error: new AuthApiError('exists', 422, 'user_already_exists'),
    });
    expect(await signUpWithPassword(input)).toMatchObject({
      ok: false,
      failure: { code: 'email_taken' },
    });
  });

  it('maps rate limiting from the email service', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: {},
      error: new AuthApiError('email rate limit exceeded', 429, 'over_email_send_rate_limit'),
    });
    expect(await signUpWithPassword(input)).toMatchObject({
      ok: false,
      failure: { code: 'rate_limited' },
    });
  });
});

describe('signOut', () => {
  it('signs out this device only', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });

    expect(await signOut()).toEqual({ ok: true, data: undefined });
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('reports a failure', async () => {
    mockAuth.signOut.mockResolvedValue({ error: new AuthApiError('x', 500, 'unexpected_failure') });
    expect(await signOut()).toMatchObject({ ok: false });
  });
});

describe('deleteAccount', () => {
  it('requires explicit confirmation in the request and clears the local session', async () => {
    mockInvoke.mockResolvedValue({ data: { deleted: true }, error: null });
    mockAuth.signOut.mockResolvedValue({ error: null });

    expect(await deleteAccount()).toEqual({ ok: true, data: undefined });
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', { body: { confirm: true } });
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('does not clear the session or claim success when the server refuses', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response('{}', { status: 500 })),
    });

    const result = await deleteAccount();

    expect(result).toMatchObject({ ok: false, failure: { code: 'unknown' } });
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });

  it('reports a network failure without clearing the session', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new Error('x')) });

    const result = await deleteAccount();

    expect(result).toMatchObject({ ok: false, failure: { code: 'network' } });
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });
});
