import { createCategoryRepository } from '@/db/categoryRepository';
import { createNoteRepository } from '@/db/noteRepository';
import type { Repositories } from '@/db/DatabaseProvider';
import type { FilingDraft } from '@/features/editor/FilingDraftProvider';
import { createTestDatabase } from '@/test/testDatabase';

import { saveFailureMessage, saveNote } from './saveNote';

const mockPersist = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/features/capture/pageImageStorage', () => ({
  persistPageImage: (...args: unknown[]) => mockPersist(...args),
  removePageImage: (...args: unknown[]) => mockRemove(...args),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'generated-id' }));

const draft: FilingDraft = {
  imageUri: 'file:///cache/scan.jpg',
  text: 'Filed text',
  memo: 'a memo',
  engine: 'cloud',
  confidence: null,
  imageWidth: null,
  imageHeight: null,
};

async function setup() {
  const db = await createTestDatabase();
  const categories = createCategoryRepository(db);
  const notes = createNoteRepository(db);
  const category = await categories.create({ name: 'Research' });
  const repositories: Repositories = { userId: 'user-1', notes, categories };
  return { repositories, category, notes };
}

describe('saveNote', () => {
  beforeEach(() => {
    mockPersist.mockReset().mockResolvedValue('file:///docs/pages/user-1/generated-id.jpg');
    mockRemove.mockReset();
  });

  it('copies the image, then saves the note under the same id', async () => {
    const { repositories, category, notes } = await setup();

    const result = await saveNote(repositories, draft, {
      categoryId: category.id,
      tags: ['#Books'],
      pinned: true,
    });

    expect(mockPersist).toHaveBeenCalledWith('user-1', 'generated-id', 'file:///cache/scan.jpg');
    expect(result).toMatchObject({
      ok: true,
      note: {
        id: 'generated-id',
        imageUri: 'file:///docs/pages/user-1/generated-id.jpg',
        tags: ['books'],
        pinned: true,
        engine: 'cloud',
      },
    });
    expect(await notes.list()).toHaveLength(1);
  });

  it('saves nothing when the image cannot be copied', async () => {
    const { repositories, category, notes } = await setup();
    mockPersist.mockRejectedValue(new Error('disk full'));

    await expect(
      saveNote(repositories, draft, { categoryId: category.id, tags: [], pinned: false }),
    ).resolves.toEqual({ ok: false, failure: 'image_failed' });
    expect(await notes.list()).toHaveLength(0);
  });

  it('removes the copied image when the note cannot be saved', async () => {
    const { repositories } = await setup();

    const result = await saveNote(repositories, draft, {
      categoryId: 'missing',
      tags: [],
      pinned: false,
    });

    expect(result).toEqual({ ok: false, failure: 'unknown_category' });
    expect(mockRemove).toHaveBeenCalledWith('file:///docs/pages/user-1/generated-id.jpg');
  });

  it('has a message for every failure', () => {
    for (const failure of ['unknown_category', 'empty_text', 'image_failed', 'failed'] as const) {
      expect(saveFailureMessage(failure)).not.toBe('');
    }
  });
});
