import { render, screen, userEvent } from '@testing-library/react-native';

import { NotesScreen } from '@/features/notes/NotesScreen';

const mockNavigate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
}));

describe('NotesScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('shows a header and the empty state when there are no notes', async () => {
    await render(<NotesScreen />);

    expect(screen.getByRole('header', { name: 'Notes' })).toBeOnTheScreen();
    expect(screen.getByText('No notes yet')).toBeOnTheScreen();
  });

  it('sends the user to Capture from the empty state', async () => {
    const user = userEvent.setup();
    await render(<NotesScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan a page' }));

    expect(mockNavigate).toHaveBeenCalledWith('/capture');
  });
});
