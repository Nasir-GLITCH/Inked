import { render, screen, userEvent } from '@testing-library/react-native';

import { AuthScreen } from '@/features/auth/AuthScreen';
import { signInWithPassword, signUpWithPassword } from '@/features/auth/authService';

jest.mock('@/features/auth/authService', () => ({
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
}));

const mockSignIn = jest.mocked(signInWithPassword);
const mockSignUp = jest.mocked(signUpWithPassword);

const SIGN_IN_EMAIL = 'Archival identity / email';
const SIGN_IN_PASSWORD = 'Security key';
const SIGN_UP_NAME = 'Scholar alias / full name';
const SIGN_UP_EMAIL = 'Archival email address';
const SIGN_UP_PASSWORD = 'Password';

const invalidCredentials = {
  ok: false as const,
  failure: {
    code: 'invalid_credentials' as const,
    message: 'The email or password is incorrect.',
  },
};

async function openCreateAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByRole('tab', { name: 'Create Account' }));
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('AuthScreen: sign in', () => {
  it('starts on sign in with email and password fields only', async () => {
    await render(<AuthScreen />);

    expect(screen.getByRole('header', { name: 'Welcome back' })).toBeOnTheScreen();
    expect(screen.getByLabelText(SIGN_IN_EMAIL)).toBeOnTheScreen();
    expect(screen.getByLabelText(SIGN_IN_PASSWORD)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open Vault' })).toBeOnTheScreen();
    expect(screen.queryByLabelText(SIGN_UP_NAME)).not.toBeOnTheScreen();
  });

  it('shows validation messages and does not call the server when fields are empty', async () => {
    const user = userEvent.setup();
    await render(<AuthScreen />);

    await user.press(screen.getByRole('button', { name: 'Open Vault' }));

    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('rejects a malformed email before contacting the server', async () => {
    const user = userEvent.setup();
    await render(<AuthScreen />);

    await user.type(screen.getByLabelText(SIGN_IN_EMAIL), 'not-an-email');
    await user.type(screen.getByLabelText(SIGN_IN_PASSWORD), 'secret');
    await user.press(screen.getByRole('button', { name: 'Open Vault' }));

    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('signs in with a trimmed, lower-cased email', async () => {
    mockSignIn.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    await render(<AuthScreen />);

    await user.type(screen.getByLabelText(SIGN_IN_EMAIL), '  Alex@Example.COM ');
    await user.type(screen.getByLabelText(SIGN_IN_PASSWORD), 'secret');
    await user.press(screen.getByRole('button', { name: 'Open Vault' }));

    expect(mockSignIn).toHaveBeenCalledWith({ email: 'alex@example.com', password: 'secret' });
  });

  it('shows the safe failure message from the server and clears it when the user edits', async () => {
    mockSignIn.mockResolvedValue(invalidCredentials);
    const user = userEvent.setup();
    await render(<AuthScreen />);

    await user.type(screen.getByLabelText(SIGN_IN_EMAIL), 'alex@example.com');
    await user.type(screen.getByLabelText(SIGN_IN_PASSWORD), 'wrong');
    await user.press(screen.getByRole('button', { name: 'Open Vault' }));

    expect(screen.getByRole('alert')).toHaveTextContent('The email or password is incorrect.');

    await user.type(screen.getByLabelText(SIGN_IN_PASSWORD), 'x');
    expect(screen.queryByText('The email or password is incorrect.')).not.toBeOnTheScreen();
  });

  it('ignores a second press while the first request is still running', async () => {
    mockSignIn.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    await render(<AuthScreen />);

    await user.type(screen.getByLabelText(SIGN_IN_EMAIL), 'alex@example.com');
    await user.type(screen.getByLabelText(SIGN_IN_PASSWORD), 'secret');
    const button = screen.getByRole('button', { name: 'Open Vault' });
    await user.press(button);
    await user.press(button);

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(button).toBeBusy();
  });

  it('can reveal and hide the password', async () => {
    const user = userEvent.setup();
    await render(<AuthScreen />);

    expect(screen.getByLabelText(SIGN_IN_PASSWORD).props.secureTextEntry).toBe(true);
    await user.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText(SIGN_IN_PASSWORD).props.secureTextEntry).toBe(false);
    await user.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText(SIGN_IN_PASSWORD).props.secureTextEntry).toBe(true);
  });
});

describe('AuthScreen: create account', () => {
  it('shows the name field and no password meter until a password is typed', async () => {
    const user = userEvent.setup();
    await render(<AuthScreen />);

    await openCreateAccount(user);

    expect(screen.getByRole('header', { name: 'Initialize Workspace' })).toBeOnTheScreen();
    expect(screen.getByLabelText(SIGN_UP_NAME)).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Password strength/)).not.toBeOnTheScreen();

    await user.type(screen.getByLabelText(SIGN_UP_PASSWORD), 'abc');
    expect(screen.getByLabelText(/Password strength. Too short/)).toBeOnTheScreen();
  });

  it('clears errors from the other mode when switching', async () => {
    const user = userEvent.setup();
    await render(<AuthScreen />);
    await user.press(screen.getByRole('button', { name: 'Open Vault' }));
    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();

    await openCreateAccount(user);

    expect(screen.queryByText('Enter your email address.')).not.toBeOnTheScreen();
  });

  it('explains a too-short password and does not contact the server', async () => {
    const user = userEvent.setup();
    await render(<AuthScreen />);
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(SIGN_UP_NAME), 'Alex');
    await user.type(screen.getByLabelText(SIGN_UP_EMAIL), 'alex@example.com');
    await user.type(screen.getByLabelText(SIGN_UP_PASSWORD), 'short');
    await user.press(screen.getByRole('button', { name: 'Create Workspace & Get Started' }));

    expect(screen.getByText('Use at least 8 characters.')).toBeOnTheScreen();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('requires a name', async () => {
    const user = userEvent.setup();
    await render(<AuthScreen />);
    await openCreateAccount(user);

    await user.press(screen.getByRole('button', { name: 'Create Workspace & Get Started' }));

    expect(screen.getByText('Enter your name.')).toBeOnTheScreen();
  });

  it('creates the account with a trimmed name and shows no notice when a session starts', async () => {
    mockSignUp.mockResolvedValue({ ok: true, data: { needsEmailConfirmation: false } });
    const user = userEvent.setup();
    await render(<AuthScreen />);
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(SIGN_UP_NAME), '  Alex Sterling ');
    await user.type(screen.getByLabelText(SIGN_UP_EMAIL), 'Alex@Example.com');
    await user.type(screen.getByLabelText(SIGN_UP_PASSWORD), 'a-long-password-1');
    await user.press(screen.getByRole('button', { name: 'Create Workspace & Get Started' }));

    expect(mockSignUp).toHaveBeenCalledWith({
      name: 'Alex Sterling',
      email: 'alex@example.com',
      password: 'a-long-password-1',
    });
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('asks the user to confirm their email when no session was started', async () => {
    mockSignUp.mockResolvedValue({ ok: true, data: { needsEmailConfirmation: true } });
    const user = userEvent.setup();
    await render(<AuthScreen />);
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(SIGN_UP_NAME), 'Alex');
    await user.type(screen.getByLabelText(SIGN_UP_EMAIL), 'alex@example.com');
    await user.type(screen.getByLabelText(SIGN_UP_PASSWORD), 'a-long-password-1');
    await user.press(screen.getByRole('button', { name: 'Create Workspace & Get Started' }));

    expect(screen.getByRole('header', { name: 'Welcome back' })).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent(/Open the confirmation link/);
    expect(screen.getByLabelText(SIGN_IN_EMAIL).props.value).toBe('alex@example.com');
    expect(screen.getByLabelText(SIGN_IN_PASSWORD).props.value).toBe('');
  });

  it('shows the account-exists message from the server', async () => {
    mockSignUp.mockResolvedValue({
      ok: false,
      failure: {
        code: 'email_taken',
        message: 'An account with this email already exists. Try signing in instead.',
      },
    });
    const user = userEvent.setup();
    await render(<AuthScreen />);
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(SIGN_UP_NAME), 'Alex');
    await user.type(screen.getByLabelText(SIGN_UP_EMAIL), 'alex@example.com');
    await user.type(screen.getByLabelText(SIGN_UP_PASSWORD), 'a-long-password-1');
    await user.press(screen.getByRole('button', { name: 'Create Workspace & Get Started' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/);
  });

  it('switches back to sign in from the footer link', async () => {
    const user = userEvent.setup();
    await render(<AuthScreen />);
    await openCreateAccount(user);

    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('header', { name: 'Welcome back' })).toBeOnTheScreen();
  });
});
