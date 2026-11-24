import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { createCategoryRepository } from '@/db/categoryRepository';
import type { DatabaseState } from '@/db/DatabaseProvider';
import { createNoteRepository } from '@/db/noteRepository';
import type { FilingDraft } from '@/features/editor/FilingDraftProvider';
import { createTestDatabase } from '@/test/testDatabase';

import { FilingScreen } from './FilingScreen';

const mockBack = jest.fn();
const mockDismissTo = jest.fn();
const mockSetDraft = jest.fn();
const mockSave = jest.fn();
let mockDraft: FilingDraft | null;
let mockDatabase: DatabaseState;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, dismissTo: mockDismissTo }),
}));
jest.mock('@/db/DatabaseProvider', () => ({ useDatabase: () => mockDatabase }));
jest.mock('@/features/editor/FilingDraftProvider', () => ({
  useFilingDraft: () => ({ draft: mockDraft, setDraft: mockSetDraft }),
}));
jest.mock('./saveNote', () => ({
  ...jest.requireActual('./saveNote'),
  saveNote: (...args: unknown[]) => mockSave(...args),
}));

const cloudDraft: FilingDraft = {
  imageUri: 'file:///cache/scan.jpg',
  text: 'Hello filed world',
  memo: '',
  engine: 'cloud',
  confidence: null,
  imageWidth: null,
  imageHeight: null,
};

async function setup(draft: FilingDraft | null = cloudDraft, seed: string[] = ['Research']) {
  const db = await createTestDatabase();
  let counter = 0;
  const newId = () => `id-${++counter}`;
  const categories = createCategoryRepository(db, () => new Date(), newId);
  const notes = createNoteRepository(db, () => new Date(), newId);
  for (const name of seed) await categories.create({ name });
  mockDatabase = { status: 'ready', repositories: { userId: 'u1', notes, categories } };
  mockDraft = draft;
  return { categories };
}

describe('FilingScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockDismissTo.mockClear();
    mockSetDraft.mockClear();
    mockSave.mockReset().mockResolvedValue({ ok: true, note: { id: 'n1' } });
  });

  it('shows an empty state when there is no draft', async () => {
    await setup(null);
    await render(<FilingScreen />);
    expect(screen.getByText('Nothing to file')).toBeOnTheScreen();
  });

  it('shows the excerpt, counts and the cloud badge without a percentage', async () => {
    await setup();
    await render(<FilingScreen />);
    expect(screen.getByText('Hello filed world')).toBeOnTheScreen();
    expect(screen.getByText('3 words • 17 characters')).toBeOnTheScreen();
    expect(screen.getByText('CLOUD TEXT')).toBeOnTheScreen();
  });

  it('shows the real percentage for on-device text', async () => {
    await setup({ ...cloudDraft, engine: 'on_device', confidence: 0.838 });
    await render(<FilingScreen />);
    expect(screen.getByText('83.8% CONF')).toBeOnTheScreen();
  });

  it('keeps Save disabled until a category is chosen', async () => {
    await setup();
    const user = userEvent.setup();
    await render(<FilingScreen />);

    const save = await screen.findByRole('button', { name: 'Save & Index Note' });
    expect(save).toBeDisabled();

    await user.press(await screen.findByRole('radio', { name: 'Research, 0 notes' }));
    expect(screen.getByRole('button', { name: 'Save & Index Note' })).toBeEnabled();
  });

  it('saves with the chosen category, tags and pin, then leaves the flow', async () => {
    await setup();
    const user = userEvent.setup();
    await render(<FilingScreen />);

    await user.press(await screen.findByRole('radio', { name: 'Research, 0 notes' }));
    await user.type(screen.getByLabelText('Add a tag'), 'Books', { submitEditing: true });
    fireEvent(screen.getByRole('switch', { name: 'Pin to home' }), 'valueChange', true);
    await user.press(screen.getByRole('button', { name: 'Save & Index Note' }));

    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/'));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      cloudDraft,
      expect.objectContaining({ tags: ['books'], pinned: true }),
    );
    expect(mockSetDraft).toHaveBeenCalledWith(null);
  });

  it('shows the failure and stays on the screen when saving fails', async () => {
    await setup();
    mockSave.mockResolvedValue({ ok: false, failure: 'image_failed' });
    const user = userEvent.setup();
    await render(<FilingScreen />);

    await user.press(await screen.findByRole('radio', { name: 'Research, 0 notes' }));
    await user.press(screen.getByRole('button', { name: 'Save & Index Note' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/page image could not be saved/i);
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(mockSetDraft).not.toHaveBeenCalled();
  });

  it('creates a category inline and selects it', async () => {
    await setup(cloudDraft, []);
    const user = userEvent.setup();
    await render(<FilingScreen />);

    expect(await screen.findByText(/no categories yet/i)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Create new category' }));
    await user.type(screen.getByLabelText('New category name'), 'Journal');
    await user.press(screen.getByRole('button', { name: 'Create' }));

    const option = await screen.findByRole('radio', { name: 'Journal, 0 notes' });
    expect(option).toBeChecked();
  });

  it('explains a duplicate category name', async () => {
    await setup();
    const user = userEvent.setup();
    await render(<FilingScreen />);

    await user.press(await screen.findByRole('button', { name: 'Create new category' }));
    await user.type(screen.getByLabelText('New category name'), 'research');
    await user.press(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already have a category/i);
  });

  it('removes a tag when it is pressed', async () => {
    await setup();
    const user = userEvent.setup();
    await render(<FilingScreen />);

    await user.type(screen.getByLabelText('Add a tag'), 'alpha', { submitEditing: true });
    await user.press(screen.getByRole('button', { name: 'Remove tag alpha' }));

    expect(screen.queryByRole('button', { name: 'Remove tag alpha' })).not.toBeOnTheScreen();
  });

  it('confirms before discarding the page', async () => {
    await setup();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    const user = userEvent.setup();
    await render(<FilingScreen />);

    await user.press(screen.getByRole('button', { name: 'Discard page' }));

    expect(mockSetDraft).toHaveBeenCalledWith(null);
    expect(mockDismissTo).toHaveBeenCalledWith('/');
    alert.mockRestore();
  });

  it('goes back to the editor from the header', async () => {
    await setup();
    const user = userEvent.setup();
    await render(<FilingScreen />);
    await user.press(screen.getByRole('button', { name: 'Go back' }));
    expect(mockBack).toHaveBeenCalled();
  });
});
