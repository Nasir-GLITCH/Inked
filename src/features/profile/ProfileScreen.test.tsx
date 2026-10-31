import { render, screen, userEvent } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { deleteAccount, signOut } from '@/features/auth/authService';
import { fetchProfile } from '@/features/profile/profileService';
import { ProfileScreen } from '@/features/profile/ProfileScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'signedIn', user: { id: 'u1', email: 'alex@example.com' } }),
}));
jest.mock('@/features/auth/authService', () => ({ signOut: jest.fn(), deleteAccount: jest.fn() }));
jest.mock('@/features/profile/profileService', () => ({ fetchProfile: jest.fn() }));

const mockSignOut = jest.mocked(signOut);
const mockDeleteAccount = jest.mocked(deleteAccount);
const mockFetchProfile = jest.mocked(fetchProfile);

const loaded = {
  ok: true as const,
  data: { displayName: 'Alex Sterling', plan: 'free' as const },
};

/** Presses "Delete account" and returns the buttons of the confirmation dialog. */
async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await user.press(screen.getByRole('button', { name: 'Delete account' }));
  expect(alert).toHaveBeenCalledTimes(1);
  return alert.mock.calls[0][2] as AlertButton[];
}

beforeEach(() => {
  jest.resetAllMocks();
  mockFetchProfile.mockResolvedValue(loaded);
});

describe('ProfileScreen', () => {
  it('shows the user’s initials, name, email and plan', async () => {
    await render(<ProfileScreen />);

    expect(await screen.findByText('Alex Sterling')).toBeOnTheScreen();
    expect(screen.getByText('AS')).toBeOnTheScreen();
    expect(screen.getByText('alex@example.com')).toBeOnTheScreen();
    expect(screen.getByText('Free plan')).toBeOnTheScreen();
  });

  it('still shows the email and a retry when the profile cannot be loaded', async () => {
    mockFetchProfile.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce(loaded);
    const user = userEvent.setup();
    await render(<ProfileScreen />);

    expect(await screen.findByText('Could not load your profile details.')).toBeOnTheScreen();
    expect(screen.getByText('alex@example.com')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Alex Sterling')).toBeOnTheScreen();
    expect(mockFetchProfile).toHaveBeenCalledTimes(2);
  });

  it('goes back when the back button is pressed', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);

    await user.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileScreen: sign out', () => {
  it('signs the user out', async () => {
    mockSignOut.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    await render(<ProfileScreen />);

    await user.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('tells the user when sign out fails', async () => {
    mockSignOut.mockResolvedValue({
      ok: false,
      failure: { code: 'network', message: 'Cannot reach the server. Check your connection.' },
    });
    const user = userEvent.setup();
    await render(<ProfileScreen />);

    await user.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Cannot reach the server/);
  });
});

describe('ProfileScreen: delete account', () => {
  it('asks for confirmation and deletes nothing until the user confirms', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);

    const buttons = await openDeleteDialog(user);

    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(buttons.map((button) => button.text)).toEqual(['Cancel', 'Delete account']);
    expect(buttons[1].style).toBe('destructive');
  });

  it('does not delete when the user cancels', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);

    const buttons = await openDeleteDialog(user);
    buttons[0].onPress?.();

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('deletes the account once the user confirms', async () => {
    mockDeleteAccount.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    await render(<ProfileScreen />);

    const buttons = await openDeleteDialog(user);
    buttons[1].onPress?.();

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('reports a failed deletion instead of pretending it worked', async () => {
    mockDeleteAccount.mockResolvedValue({
      ok: false,
      failure: { code: 'unknown', message: 'Something went wrong. Please try again.' },
    });
    const user = userEvent.setup();
    await render(<ProfileScreen />);

    const buttons = await openDeleteDialog(user);
    buttons[1].onPress?.();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Something went wrong/);
  });
});
