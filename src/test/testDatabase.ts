import Database from 'better-sqlite3';

import { migrate } from '@/db/migrations';
import type { SqlDatabase, SqlParam } from '@/db/sqlTypes';

/** A real, in-memory SQLite database behind the app's SqlDatabase interface, for tests. */
export async function createTestDatabase(): Promise<SqlDatabase> {
  const sqlite = new Database(':memory:');
  const db: SqlDatabase = {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, params: SqlParam[] = []) {
      return sqlite.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, params: SqlParam[] = []) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[] = []) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  await migrate(db);
  return db;
}
