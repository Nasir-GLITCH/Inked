import { createTestDatabase } from '@/test/testDatabase';

import { getSchemaVersion, migrate, MIGRATIONS } from './migrations';

describe('migrate', () => {
  it('brings a new database to the latest version', async () => {
    const db = await createTestDatabase();
    expect(await getSchemaVersion(db)).toBe(MIGRATIONS.length);
  });

  it('is safe to run again and keeps existing data', async () => {
    const db = await createTestDatabase();
    await db.runAsync(
      "INSERT INTO categories (id, name, name_key, created_at) VALUES ('c1', 'A', 'a', 'now')",
    );
    await migrate(db);
    const rows = await db.getAllAsync('SELECT id FROM categories');
    expect(rows).toHaveLength(1);
    expect(await getSchemaVersion(db)).toBe(MIGRATIONS.length);
  });
});
