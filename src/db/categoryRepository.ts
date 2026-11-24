import { randomUUID } from 'expo-crypto';

import type { SqlDatabase } from './sqlTypes';

export const MAX_CATEGORY_NAME_LENGTH = 60;
export const MAX_CATEGORY_SUBTITLE_LENGTH = 60;

export type Category = {
  id: string;
  name: string;
  subtitle: string | null;
  noteCount: number;
};

export type CategoryErrorCode = 'invalid_name' | 'duplicate_name';

export class CategoryError extends Error {
  constructor(readonly code: CategoryErrorCode) {
    super(code);
    this.name = 'CategoryError';
  }
}

type CategoryRow = { id: string; name: string; subtitle: string | null; note_count: number };

function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function createCategoryRepository(
  db: SqlDatabase,
  now: () => Date = () => new Date(),
  newId: () => string = randomUUID,
) {
  return {
    /** All categories with their note counts, alphabetical. */
    async list(): Promise<Category[]> {
      const rows = await db.getAllAsync<CategoryRow>(
        `SELECT c.id, c.name, c.subtitle, COUNT(n.id) AS note_count
           FROM categories c LEFT JOIN notes n ON n.category_id = c.id
          GROUP BY c.id ORDER BY c.name COLLATE NOCASE`,
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        subtitle: row.subtitle,
        noteCount: row.note_count,
      }));
    },

    /** Creates a category. Names are unique ignoring case and extra spaces. */
    async create(input: { name: string; subtitle?: string }): Promise<Category> {
      const name = input.name.trim().replace(/\s+/g, ' ');
      if (name === '' || name.length > MAX_CATEGORY_NAME_LENGTH) {
        throw new CategoryError('invalid_name');
      }
      const subtitle = input.subtitle?.trim().slice(0, MAX_CATEGORY_SUBTITLE_LENGTH) || null;
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE name_key = ?',
        [nameKey(name)],
      );
      if (existing) throw new CategoryError('duplicate_name');

      const id = newId();
      await db.runAsync(
        'INSERT INTO categories (id, name, name_key, subtitle, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, name, nameKey(name), subtitle, now().toISOString()],
      );
      return { id, name, subtitle, noteCount: 0 };
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
