import * as SQLite from 'expo-sqlite';

import { migrate } from './migrations';
import type { SqlDatabase } from './sqlTypes';

function adapt(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, params),
    getAllAsync: <T>(sql: string, params: (string | number | null)[] = []) =>
      db.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: (string | number | null)[] = []) =>
      db.getFirstAsync<T>(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

/**
 * Opens (and migrates) the on-device database for one signed-in user. Each user gets
 * their own file, so a second account on the same phone never sees the first one's notes.
 */
export async function openUserDatabase(userId: string): Promise<SqlDatabase> {
  if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
    throw new Error('Cannot open a database for an invalid user id.');
  }
  const db = adapt(await SQLite.openDatabaseAsync(`inked-${userId}.db`));
  await migrate(db);
  return db;
}
