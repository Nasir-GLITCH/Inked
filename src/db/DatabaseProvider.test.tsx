import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DatabaseProvider, useDatabase } from './DatabaseProvider';

const mockOpen = jest.fn();
let mockUser: { id: string } | null = { id: '11111111-1111-1111-1111-111111111111' };

jest.mock('./openDatabase', () => ({ openUserDatabase: (id: string) => mockOpen(id) }));
jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: mockUser }) }));

function Probe() {
  const state = useDatabase();
  return (
    <Text>{state.status === 'ready' ? `ready:${state.repositories.userId}` : state.status}</Text>
  );
}

describe('DatabaseProvider', () => {
  beforeEach(() => {
    mockOpen.mockReset();
    mockUser = { id: '11111111-1111-1111-1111-111111111111' };
  });

  it('opens the signed-in user database and exposes repositories', async () => {
    mockOpen.mockResolvedValue({});
    await render(
      <DatabaseProvider>
        <Probe />
      </DatabaseProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('ready:11111111-1111-1111-1111-111111111111')).toBeOnTheScreen(),
    );
    expect(mockOpen).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
  });

  it('reports an error when the database cannot be opened', async () => {
    mockOpen.mockRejectedValue(new Error('disk full'));
    await render(
      <DatabaseProvider>
        <Probe />
      </DatabaseProvider>,
    );
    await waitFor(() => expect(screen.getByText('error')).toBeOnTheScreen());
  });

  it('stays loading and opens nothing when nobody is signed in', async () => {
    mockUser = null;
    await render(
      <DatabaseProvider>
        <Probe />
      </DatabaseProvider>,
    );
    expect(screen.getByText('loading')).toBeOnTheScreen();
    expect(mockOpen).not.toHaveBeenCalled();
  });
});
