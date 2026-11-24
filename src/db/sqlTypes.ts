export type SqlParam = string | number | null;

/**
 * The slice of the database API the app uses. expo-sqlite's SQLiteDatabase satisfies it,
 * and tests run the same repositories against better-sqlite3 behind this interface.
 */
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlParam[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  /** All statements inside the callback commit together or not at all. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
