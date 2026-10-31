import { act, render, screen } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';

type AuthListener = (event: string, session: unknown) => void;

const mockAuth = {
  onAuthStateChange: jest.fn(),
  getSession: jest.fn(),
  startAutoRefresh: jest.fn(),
  stopAutoRefresh: jest.fn(),
};
const mockUnsubscribe = jest.fn();
let listener: AuthListener;

jest.mock('@/services/supabase', () => ({
  getSupabase: () => ({ auth: mockAuth }),
}));

// Pass `{}` as `overrides` to build a user with no email (an explicit `undefined` would hit the default).
const session = (id: string, overrides: { email?: string } = { email: 'a@b.co' }) => ({
  user: { id, ...overrides },
});

function Probe() {
  const { status, user } = useAuth();
  return <Text testID="probe">{`${status}|${user?.id ?? '-'}|${user?.email ?? '-'}`}</Text>;
}

const probe = () => screen.getByTestId('probe').props.children as string;

beforeEach(() => {
  jest.resetAllMocks();
  // resetAllMocks clears the default AppState mock, so give it a working subscription.
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  mockAuth.onAuthStateChange.mockImplementation((callback: AuthListener) => {
    listener = callback;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });
});

describe('AuthProvider', () => {
  it('starts in loading until the stored session has been read', async () => {
    mockAuth.getSession.mockReturnValue(new Promise(() => undefined));
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(probe()).toBe('loading|-|-');
  });

  it('becomes signedOut when there is no stored session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(probe()).toBe('signedOut|-|-');
  });

  it('restores a stored session as signedIn', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: session('u1') } });
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(probe()).toBe('signedIn|u1|a@b.co');
  });

  it('falls back to signedOut instead of hanging when the session cannot be read', async () => {
    mockAuth.getSession.mockRejectedValue(new Error('storage unavailable'));
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(probe()).toBe('signedOut|-|-');
  });

  it('follows sign-in and sign-out events', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => listener('SIGNED_IN', session('u2', { email: 'x@y.co' })));
    expect(probe()).toBe('signedIn|u2|x@y.co');

    await act(async () => listener('SIGNED_OUT', null));
    expect(probe()).toBe('signedOut|-|-');
  });

  it('drops to signedOut when the server revokes the session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: session('u1') } });
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => listener('SIGNED_OUT', null));
    expect(probe()).toBe('signedOut|-|-');
  });

  it('handles a user without an email address', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: session('u3', {}) } });
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(probe()).toBe('signedIn|u3|-');
  });

  it('refreshes tokens only while the app is in the foreground', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    const remove = jest.fn();
    let appStateListener: (state: string) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _type: string,
      callback: (state: string) => void,
    ) => {
      appStateListener = callback;
      return { remove };
    }) as unknown as typeof AppState.addEventListener);

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => appStateListener('background'));
    expect(mockAuth.stopAutoRefresh).toHaveBeenCalled();
    mockAuth.startAutoRefresh.mockClear();
    await act(async () => appStateListener('active'));
    expect(mockAuth.startAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('cleans up its listeners on unmount', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    const view = await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await view.unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('useAuth', () => {
  it('throws a clear error when used outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Probe />)).rejects.toThrow(/inside <AuthProvider>/);
  });
});
