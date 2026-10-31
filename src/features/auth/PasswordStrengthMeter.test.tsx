import { render, screen } from '@testing-library/react-native';

import { PasswordStrengthMeter } from '@/features/auth/PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('renders nothing before a password is typed', async () => {
    await render(<PasswordStrengthMeter password="" />);

    expect(screen.queryByLabelText(/Password strength/)).not.toBeOnTheScreen();
  });

  it('explains weak passwords in words, not only colour', async () => {
    await render(<PasswordStrengthMeter password="abcdefgh" />);

    expect(screen.getByLabelText(/Password strength. Weak/)).toBeOnTheScreen();
    expect(screen.getByText(/Weak/)).toBeOnTheScreen();
  });

  it('confirms a strong password', async () => {
    await render(<PasswordStrengthMeter password="Correct-horse-battery-9" />);

    expect(screen.getByText(/Strong/)).toBeOnTheScreen();
  });
});
