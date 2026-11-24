import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { createCategoryRepository } from '@/db/categoryRepository';
import type { DatabaseState } from '@/db/DatabaseProvider';
import { createNoteRepository } from '@/db/noteRepository';
import { createTestDatabase } from '@/test/testDatabase';

import { NoteDetailScreen } from './NoteDetailScreen';

const mockBack = jest.fn();
const mockRemoveImage = jest.fn();
let mockDatabase: DatabaseState;

jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/db/DatabaseProvider', () => ({ useDatabase: () => mockDatabase }));
jest.mock('@/features/capture/pageImageStorage', () => ({
  removePageImage: (...args: unknown[]) => mockRemoveImage(...args),
}));

async function setup() {
  const db = await createTestDatabase();
  let counter = 0;
  const newId = () => `id-${++counter}`;
  const categories = createCategoryRepository(db, () => new Date(), newId);
  const notes = createNoteRepository(db, () => new Date(), newId);
  mockDatabase = { status: 'ready', repositories: { userId: 'u1', notes, categories } };
  const category = await categories.create({ name: 'Research' });
  const note = await notes.create({
    categoryId: category.id,
    body: 'The title\nBody of the note',
    memo: 'shelf 3',
    engine: 'on_device',
    confidence: 0.838,
    imageUri: 'file:///docs/pages/u1/id-2.jpg',
    tags: ['sea'],
  });
  return { notes, note };
}

describe('NoteDetailScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockRemoveImage.mockClear();
  });

  it('shows the note text, tags, memo and real confidence', async () => {
    const { note } = await setup();
    await render(<NoteDetailScreen id={note.id} />);

    expect(await screen.findByRole('header', { name: 'The title' })).toBeOnTheScreen();
    expect(screen.getByText(/Body of the note/)).toBeOnTheScreen();
    expect(screen.getByText('#sea')).toBeOnTheScreen();
    expect(screen.getByText('shelf 3')).toBeOnTheScreen();
    expect(screen.getByText('83.8% CONF')).toBeOnTheScreen();
  });

  it('says so when the note does not exist', async () => {
    await setup();
    await render(<NoteDetailScreen id="missing" />);
    expect(await screen.findByText('Note not found')).toBeOnTheScreen();
  });

  it('deletes the note and its image after confirmation', async () => {
    const { note, notes } = await setup();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    const user = userEvent.setup();
    await render(<NoteDetailScreen id={note.id} />);

    await user.press(await screen.findByRole('button', { name: 'Delete note' }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(await notes.get(note.id)).toBeNull();
    expect(mockRemoveImage).toHaveBeenCalledWith('file:///docs/pages/u1/id-2.jpg');
    alert.mockRestore();
  });

  it('keeps the note when the user cancels the confirmation', async () => {
    const { note, notes } = await setup();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const user = userEvent.setup();
    await render(<NoteDetailScreen id={note.id} />);

    await user.press(await screen.findByRole('button', { name: 'Delete note' }));

    expect(await notes.get(note.id)).not.toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
