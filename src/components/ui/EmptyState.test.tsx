import { render, screen, userEvent } from '@testing-library/react-native';

import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('shows the title and message', async () => {
    await render(<EmptyState icon="description" title="No notes yet" message="Scan a page." />);

    expect(screen.getByText('No notes yet')).toBeOnTheScreen();
    expect(screen.getByText('Scan a page.')).toBeOnTheScreen();
  });

  it('renders no button when no action is provided', async () => {
    await render(<EmptyState icon="description" title="No notes yet" message="Scan a page." />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('runs the action when its button is pressed', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <EmptyState
        icon="description"
        title="No notes yet"
        message="Scan a page."
        action={{ label: 'Scan a page', onPress }}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Scan a page' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
