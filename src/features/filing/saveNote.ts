import { randomUUID } from 'expo-crypto';

import { NoteError, type Note } from '@/db/noteRepository';
import type { Repositories } from '@/db/DatabaseProvider';
import { persistPageImage, removePageImage } from '@/features/capture/pageImageStorage';
import type { FilingDraft } from '@/features/editor/FilingDraftProvider';

export type SaveFailure = 'unknown_category' | 'empty_text' | 'image_failed' | 'failed';

export type SaveResult = { ok: true; note: Note } | { ok: false; failure: SaveFailure };

export type SaveOptions = {
  categoryId: string;
  tags: readonly string[];
  pinned: boolean;
};

/**
 * Saves a filed page: copies its image into app storage, then writes the note. If the
 * database write fails, the copied image is removed again so nothing is left behind.
 * Never throws.
 */
export async function saveNote(
  repositories: Repositories,
  draft: FilingDraft,
  options: SaveOptions,
): Promise<SaveResult> {
  const id = randomUUID();

  let imageUri: string;
  try {
    imageUri = await persistPageImage(repositories.userId, id, draft.imageUri);
  } catch {
    return { ok: false, failure: 'image_failed' };
  }

  try {
    const note = await repositories.notes.create({
      id,
      categoryId: options.categoryId,
      body: draft.text,
      memo: draft.memo,
      engine: draft.engine,
      confidence: draft.confidence,
      imageUri,
      pinned: options.pinned,
      tags: options.tags,
    });
    return { ok: true, note };
  } catch (error) {
    removePageImage(imageUri);
    if (error instanceof NoteError) {
      return { ok: false, failure: error.code === 'empty_body' ? 'empty_text' : error.code };
    }
    return { ok: false, failure: 'failed' };
  }
}

const SAVE_MESSAGES: Record<SaveFailure, string> = {
  unknown_category: 'That category no longer exists. Choose another one.',
  empty_text: 'There is no text to save.',
  image_failed:
    'The page image could not be saved on this phone. Check your free storage and try again.',
  failed: 'The note could not be saved. Please try again.',
};

export function saveFailureMessage(failure: SaveFailure): string {
  return SAVE_MESSAGES[failure];
}
