import { createTestDatabase } from '@/test/testDatabase';

import { CategoryError, createCategoryRepository } from './categoryRepository';

let counter = 0;
const newId = () => `id-${++counter}`;

async function setup() {
  const db = await createTestDatabase();
  return {
    db,
    categories: createCategoryRepository(db, () => new Date('2026-11-08T10:00:00Z'), newId),
  };
}

describe('categoryRepository', () => {
  it('creates and lists categories alphabetically with note counts', async () => {
    const { categories } = await setup();
    await categories.create({ name: 'Research', subtitle: 'Empirical data' });
    await categories.create({ name: 'architecture' });

    const list = await categories.list();
    expect(list.map((c) => c.name)).toEqual(['architecture', 'Research']);
    expect(list[1]).toMatchObject({ subtitle: 'Empirical data', noteCount: 0 });
  });

  it('trims and collapses spaces in names', async () => {
    const { categories } = await setup();
    const created = await categories.create({ name: '  Personal   Journal ' });
    expect(created.name).toBe('Personal Journal');
  });

  it('rejects empty and overlong names', async () => {
    const { categories } = await setup();
    await expect(categories.create({ name: '   ' })).rejects.toMatchObject({
      code: 'invalid_name',
    });
    await expect(categories.create({ name: 'x'.repeat(61) })).rejects.toBeInstanceOf(CategoryError);
  });

  it('rejects duplicates ignoring case and extra spaces', async () => {
    const { categories } = await setup();
    await categories.create({ name: 'Book Quotes' });
    await expect(categories.create({ name: ' book   QUOTES ' })).rejects.toMatchObject({
      code: 'duplicate_name',
    });
  });
});
