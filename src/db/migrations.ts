import type { SqlDatabase } from './sqlTypes';

/**
 * Versioned, append-only schema migrations. The applied version is kept in SQLite's
 * `PRAGMA user_version`. Never edit a migration that has shipped: add a new one.
 */
export const MIGRATIONS: readonly string[] = [
  // 1: categories, notes and tags
  `
  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL UNIQUE,
    subtitle TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    memo TEXT,
    engine TEXT NOT NULL CHECK (engine IN ('on_device', 'cloud')),
    confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    word_count INTEGER NOT NULL CHECK (word_count >= 0),
    char_count INTEGER NOT NULL CHECK (char_count >= 0),
    image_uri TEXT,
    pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX notes_category_idx ON notes (category_id, created_at DESC);
  CREATE INDEX notes_list_idx ON notes (pinned DESC, created_at DESC);

  CREATE TABLE note_tags (
    note_id TEXT NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (note_id, tag)
  );
  CREATE INDEX note_tags_tag_idx ON note_tags (tag);
  `,
];

export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Brings the database up to the latest schema. Safe to call on every launch. */
export async function migrate(db: SqlDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON');
  const current = await getSchemaVersion(db);
  for (let version = current; version < MIGRATIONS.length; version++) {
    const sql = MIGRATIONS[version];
    if (sql === undefined) break;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      // PRAGMA does not accept bound parameters; the number comes from our own array index.
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
