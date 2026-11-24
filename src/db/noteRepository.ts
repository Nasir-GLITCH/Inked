import { randomUUID } from 'expo-crypto';

import { normalizeTags } from './tags';
import type { SqlDatabase } from './sqlTypes';

export type NoteEngine = 'on_device' | 'cloud';

export type Note = {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  body: string;
  memo: string | null;
  engine: NoteEngine;
  /** 0 to 1. Only present for on-device text; cloud text has no confidence score. */
  confidence: number | null;
  wordCount: number;
  charCount: number;
  imageUri: string | null;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type NewNote = {
  /** Optional: lets the caller store related files under the note's id before saving it. */
  id?: string;
  categoryId: string;
  body: string;
  memo?: string;
  engine: NoteEngine;
  confidence: number | null;
  imageUri: string | null;
  pinned?: boolean;
  tags?: readonly string[];
};

export type NoteErrorCode = 'empty_body' | 'unknown_category';

export class NoteError extends Error {
  constructor(readonly code: NoteErrorCode) {
    super(code);
    this.name = 'NoteError';
  }
}

const TITLE_MAX_LENGTH = 80;

/** First non-empty line of the text, shortened, used as the note's list title. */
export function deriveTitle(body: string): string {
  const firstLine = body.split('\n').find((line) => line.trim() !== '') ?? '';
  const collapsed = firstLine.trim().replace(/\s+/g, ' ');
  return collapsed.length > TITLE_MAX_LENGTH
    ? `${collapsed.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : collapsed;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

type NoteRow = {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  body: string;
  memo: string | null;
  engine: NoteEngine;
  confidence: number | null;
  word_count: number;
  char_count: number;
  image_uri: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
};

const SELECT_NOTES = `
  SELECT n.*, c.name AS category_name
    FROM notes n JOIN categories c ON c.id = n.category_id`;

export function createNoteRepository(
  db: SqlDatabase,
  now: () => Date = () => new Date(),
  newId: () => string = randomUUID,
) {
  async function tagsByNote(noteIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (noteIds.length === 0) return map;
    const placeholders = noteIds.map(() => '?').join(', ');
    const rows = await db.getAllAsync<{ note_id: string; tag: string }>(
      `SELECT note_id, tag FROM note_tags WHERE note_id IN (${placeholders}) ORDER BY tag`,
      noteIds,
    );
    for (const row of rows) {
      map.set(row.note_id, [...(map.get(row.note_id) ?? []), row.tag]);
    }
    return map;
  }

  function toNote(row: NoteRow, tags: string[]): Note {
    return {
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      title: row.title,
      body: row.body,
      memo: row.memo,
      engine: row.engine,
      confidence: row.confidence,
      wordCount: row.word_count,
      charCount: row.char_count,
      imageUri: row.image_uri,
      pinned: row.pinned === 1,
      tags,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return {
    /** Saves a note and its tags atomically. */
    async create(input: NewNote): Promise<Note> {
      const body = input.body.trim();
      if (body === '') throw new NoteError('empty_body');

      const category = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE id = ?',
        [input.categoryId],
      );
      if (!category) throw new NoteError('unknown_category');

      const id = input.id ?? newId();
      const timestamp = now().toISOString();
      const tags = normalizeTags(input.tags ?? []);
      const memo = input.memo?.trim() || null;

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO notes (id, category_id, title, body, memo, engine, confidence, word_count,
                              char_count, image_uri, pinned, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            input.categoryId,
            deriveTitle(body),
            body,
            memo,
            input.engine,
            input.confidence,
            countWords(body),
            body.length,
            input.imageUri,
            input.pinned ? 1 : 0,
            timestamp,
            timestamp,
          ],
        );
        for (const tag of tags) {
          await db.runAsync('INSERT INTO note_tags (note_id, tag) VALUES (?, ?)', [id, tag]);
        }
      });

      const saved = await this.get(id);
      if (!saved) throw new Error('Note was not found right after saving it.');
      return saved;
    },

    async get(id: string): Promise<Note | null> {
      const row = await db.getFirstAsync<NoteRow>(`${SELECT_NOTES} WHERE n.id = ?`, [id]);
      if (!row) return null;
      const tags = await tagsByNote([id]);
      return toNote(row, tags.get(id) ?? []);
    },

    /** Pinned notes first, then newest first. Optionally limited to one category. */
    async list(options: { categoryId?: string } = {}): Promise<Note[]> {
      const rows = options.categoryId
        ? await db.getAllAsync<NoteRow>(
            `${SELECT_NOTES} WHERE n.category_id = ? ORDER BY n.pinned DESC, n.created_at DESC`,
            [options.categoryId],
          )
        : await db.getAllAsync<NoteRow>(
            `${SELECT_NOTES} ORDER BY n.pinned DESC, n.created_at DESC`,
          );
      const tags = await tagsByNote(rows.map((row) => row.id));
      return rows.map((row) => toNote(row, tags.get(row.id) ?? []));
    },

    async remove(id: string): Promise<void> {
      await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    },
  };
}

export type NoteRepository = ReturnType<typeof createNoteRepository>;
