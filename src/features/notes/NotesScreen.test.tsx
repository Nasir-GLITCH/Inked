import { render, screen, userEvent } from '@testing-library/react-native';

import { createCategoryRepository } from '@/db/categoryRepository';
import type { DatabaseState } from '@/db/DatabaseProvider';
import { createNoteRepository } from '@/db/noteRepository';
import { NotesScreen } from '@/features/notes/NotesScreen';
import { createTestDatabase } from '@/test/testDatabase';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
let mockDatabase: DatabaseState;

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate, push: mockPush }),
  useFocusEffect: (effect: () => void) => {
    // Stand-in for the real hook: run the effect once on mount.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot reference imports
    require('react').useEffect(effect, [effect]);
  },
}));
jest.mock('@/db/DatabaseProvider', () => ({ useDatabase: () => mockDatabase }));
jest.mock('@/features/profile/ProfileButton', () => ({ ProfileButton: () => null }));

async function setup() {
  const db = await createTestDatabase();
  let counter = 0;
  const newId = () => `id-${++counter}`;
  const categories = createCategoryRepository(db, () => new Date(), newId);
  const notes = createNoteRepository(db, () => new Date(), newId);
  mockDatabase = { status: 'ready', repositories: { userId: 'u1', notes, categories } };
  return { categories, notes };
}

const base = { engine: 'cloud', confidence: null, imageUri: null } as const;

describe('NotesScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
  });

  it('shows a header and the empty state when there are no notes', async () => {
    await setup();
    await render(<NotesScreen />);

    expect(screen.getByRole('header', { name: 'Notes' })).toBeOnTheScreen();
    expect(await screen.findByText('No notes yet')).toBeOnTheScreen();
  });

  it('sends the user to Capture from the empty state', async () => {
    await setup();
    const user = userEvent.setup();
    await render(<NotesScreen />);

    await user.press(await screen.findByRole('button', { name: 'Scan a page' }));

    expect(mockNavigate).toHaveBeenCalledWith('/capture');
  });

  it('lists saved notes with category, tags and the cloud badge', async () => {
    const { categories, notes } = await setup();
    const research = await categories.create({ name: 'Research' });
    await notes.create({
      ...base,
      categoryId: research.id,
      body: 'Field notes\nTide tables were off',
      tags: ['sea'],
    });
    await render(<NotesScreen />);

    expect(await screen.findByText('Field notes')).toBeOnTheScreen();
    expect(screen.getByText('Tide tables were off')).toBeOnTheScreen();
    expect(screen.getByText('#sea')).toBeOnTheScreen();
    expect(screen.getByText('CLOUD TEXT')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'All (1)' })).toBeOnTheScreen();
  });

  it('filters by category', async () => {
    const { categories, notes } = await setup();
    const a = await categories.create({ name: 'Research' });
    const b = await categories.create({ name: 'Journal' });
    await notes.create({ ...base, categoryId: a.id, body: 'Alpha note' });
    await notes.create({ ...base, categoryId: b.id, body: 'Beta note' });
    const user = userEvent.setup();
    await render(<NotesScreen />);

    await user.press(await screen.findByRole('tab', { name: 'Journal (1)' }));

    expect(await screen.findByText('Beta note')).toBeOnTheScreen();
    expect(screen.queryByText('Alpha note')).not.toBeOnTheScreen();
  });

  it('opens a note', async () => {
    const { categories, notes } = await setup();
    const c = await categories.create({ name: 'Research' });
    const saved = await notes.create({ ...base, categoryId: c.id, body: 'Open me' });
    const user = userEvent.setup();
    await render(<NotesScreen />);

    await user.press(await screen.findByRole('button', { name: 'Open me, Research' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/note/[id]', params: { id: saved.id } });
  });

  it('offers a retry when the database failed to open', async () => {
    mockDatabase = { status: 'error' };
    await render(<NotesScreen />);

    expect(await screen.findByText('Notes could not be loaded')).toBeOnTheScreen();
  });
});
