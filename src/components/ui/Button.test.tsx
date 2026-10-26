import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('exposes a button role and its label to assistive technology', async () => {
    await render(<Button label="Save note" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Save note' })).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Save note" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Save note' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Save note" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Save note' });
    await user.press(button);

    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores presses and reports busy while loading, preventing duplicate submits', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Save note" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Save note' });
    await user.press(button);

    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
