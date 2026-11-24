import { createTestDatabase } from '@/test/testDatabase';

import { createCategoryRepository } from './categoryRepository';
import { countWords, createNoteRepository, deriveTitle, NoteError } from './noteRepository';

let counter = 0;
const newId = () => `id-${++counter}`;
let clock = new Date('2026-11-08T10:00:00Z');
const now = () => clock;

async function setup() {
  const db = await createTestDatabase();
  const categories = createCategoryRepository(db, now, newId);
  const notes = createNoteRepository(db, now, newId);
  const category = await categories.create({ name: 'Philosophy' });
  return { db, categories, notes, category };
}

const base = { engine: 'cloud' as const, confidence: null, imageUri: null };

describe('deriveTitle and countWords', () => {
  it('uses the first non-empty line, shortened', () => {
    expect(deriveTitle('\n\n  Hello   world \nsecond')).toBe('Hello world');
    expect(deriveTitle('a'.repeat(200))).toHaveLength(80);
    expect(deriveTitle('a'.repeat(200)).endsWith('…')).toBe(true);
  });

  it('counts words', () => {
    expect(countWords(' one  two\nthree ')).toBe(3);
    expect(countWords('')).toBe(0);
  });
});

describe('noteRepository', () => {
  it('saves a note with tags and reads it back', async () => {
    const { notes, category } = await setup();
    const saved = await notes.create({
      ...base,
      categoryId: category.id,
      body: '  The act of transcription\nis never passive.  ',
      memo: ' from the 1890 edition ',
      tags: ['#Epistemology', 'books', 'books'],
      imageUri: 'file:///pages/a.jpg',
    });

    expect(saved).toMatchObject({
      title: 'The act of transcription',
      body: 'The act of transcription\nis never passive.',
      memo: 'from the 1890 edition',
      categoryName: 'Philosophy',
      wordCount: 7,
      pinned: false,
      tags: ['books', 'epistemology'],
      imageUri: 'file:///pages/a.jpg',
    });
    expect(await notes.get(saved.id)).toEqual(saved);
  });

  it('uses a caller-provided id', async () => {
    const { notes, category } = await setup();
    const saved = await notes.create({ ...base, id: 'my-id', categoryId: category.id, body: 'x' });
    expect(saved.id).toBe('my-id');
  });

  it('stores on-device confidence and rejects values outside 0 to 1', async () => {
    const { notes, category, db } = await setup();
    const saved = await notes.create({
      ...base,
      engine: 'on_device',
      confidence: 0.66,
      categoryId: category.id,
      body: 'text',
    });
    expect(saved.confidence).toBeCloseTo(0.66);

    await expect(
      db.runAsync(
        `INSERT INTO notes (id, category_id, title, body, engine, confidence, word_count, char_count,
                            created_at, updated_at)
         VALUES ('bad', ?, 't', 'b', 'cloud', 1.5, 1, 1, 'n', 'n')`,
        [category.id],
      ),
    ).rejects.toThrow();
  });

  it('refuses an empty body and an unknown category', async () => {
    const { notes, category } = await setup();
    await expect(
      notes.create({ ...base, categoryId: category.id, body: '  \n ' }),
    ).rejects.toMatchObject({
      code: 'empty_body',
    });
    await expect(
      notes.create({ ...base, categoryId: 'missing', body: 'x' }),
    ).rejects.toBeInstanceOf(NoteError);
  });

  it('lists pinned notes first, then newest first, and filters by category', async () => {
    const { notes, categories, category } = await setup();
    const other = await categories.create({ name: 'Journal' });

    clock = new Date('2026-11-08T10:00:00Z');
    const oldest = await notes.create({ ...base, categoryId: category.id, body: 'oldest' });
    clock = new Date('2026-11-08T11:00:00Z');
    const pinned = await notes.create({
      ...base,
      categoryId: category.id,
      body: 'pinned',
      pinned: true,
    });
    clock = new Date('2026-11-08T12:00:00Z');
    const newest = await notes.create({ ...base, categoryId: other.id, body: 'newest' });

    expect((await notes.list()).map((n) => n.id)).toEqual([pinned.id, newest.id, oldest.id]);
    expect((await notes.list({ categoryId: category.id })).map((n) => n.id)).toEqual([
      pinned.id,
      oldest.id,
    ]);
  });

  it('counts notes per category', async () => {
    const { notes, categories, category } = await setup();
    await notes.create({ ...base, categoryId: category.id, body: 'one' });
    await notes.create({ ...base, categoryId: category.id, body: 'two' });
    const list = await categories.list();
    expect(list.find((c) => c.id === category.id)?.noteCount).toBe(2);
  });

  it('removes a note and its tags, and blocks deleting a category that still has notes', async () => {
    const { notes, db, category } = await setup();
    const saved = await notes.create({ ...base, categoryId: category.id, body: 'x', tags: ['a'] });

    await expect(
      db.runAsync('DELETE FROM categories WHERE id = ?', [category.id]),
    ).rejects.toThrow();

    await notes.remove(saved.id);
    expect(await notes.get(saved.id)).toBeNull();
    expect(await db.getAllAsync('SELECT * FROM note_tags')).toHaveLength(0);
  });

  it('rolls back the whole save if a tag cannot be stored', async () => {
    const { notes, db, category } = await setup();
    // Force a failure partway through the transaction by dropping the tags table.
    await db.execAsync('DROP TABLE note_tags');
    await expect(
      notes.create({ ...base, categoryId: category.id, body: 'x', tags: ['a'] }),
    ).rejects.toThrow();
    expect(await db.getAllAsync('SELECT * FROM notes')).toHaveLength(0);
  });
});
