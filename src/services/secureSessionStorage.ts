import * as SecureStore from 'expo-secure-store';

/**
 * Session storage for supabase-js backed by the OS keystore (Android Keystore / iOS Keychain).
 *
 * Why chunking: SecureStore values are limited to about 2 KB, and a Supabase session
 * (tokens plus the user object) is usually larger. A value is split into small chunks
 * stored under a generation id, and a small "meta" entry (written last) points at the
 * current generation. A write that is interrupted therefore never leaves a half-new,
 * half-old session: readers keep seeing the previous complete one.
 */

export type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

/** Characters per chunk. 500 chars is at most 2000 bytes even if every char takes 4 UTF-8 bytes. */
export const CHUNK_SIZE = 500;
/** Upper bound (about 20 KB) that stops a corrupted meta entry from causing huge reads. */
const MAX_CHUNKS = 40;

type Meta = { g: string; n: number };

function chunkKey(key: string, generation: string, index: number): string {
  return `${key}.${generation}.${index}`;
}

function newGeneration(): string {
  // A uniqueness label only; nothing secret depends on it.
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function splitIntoChunks(value: string): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += CHUNK_SIZE) {
    chunks.push(value.slice(start, start + CHUNK_SIZE));
  }
  return chunks;
}

export function createChunkedSecureStorage(store: SecureStoreLike) {
  async function readMeta(key: string): Promise<Meta | null> {
    const raw = await store.getItemAsync(key);
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // A corrupt entry is treated as "no stored session"; the user simply signs in again.
      return null;
    }
    const meta = parsed as Partial<Meta> | null;
    if (
      typeof meta?.g === 'string' &&
      Number.isInteger(meta.n) &&
      (meta.n as number) >= 0 &&
      (meta.n as number) <= MAX_CHUNKS
    ) {
      return { g: meta.g, n: meta.n as number };
    }
    return null;
  }

  async function deleteChunks(key: string, meta: Meta): Promise<void> {
    await Promise.all(
      Array.from({ length: meta.n }, (_, index) =>
        store.deleteItemAsync(chunkKey(key, meta.g, index)),
      ),
    );
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const meta = await readMeta(key);
      if (!meta) return null;
      const parts = await Promise.all(
        Array.from({ length: meta.n }, (_, index) =>
          store.getItemAsync(chunkKey(key, meta.g, index)),
        ),
      );
      if (parts.some((part) => part === null)) return null;
      return parts.join('');
    },

    async setItem(key: string, value: string): Promise<void> {
      const chunks = splitIntoChunks(value);
      if (chunks.length > MAX_CHUNKS) {
        throw new Error('Session is too large to store securely.');
      }
      const previous = await readMeta(key);
      const generation = newGeneration();
      for (let index = 0; index < chunks.length; index += 1) {
        await store.setItemAsync(chunkKey(key, generation, index), chunks[index]);
      }
      const meta: Meta = { g: generation, n: chunks.length };
      await store.setItemAsync(key, JSON.stringify(meta));
      if (previous) await deleteChunks(key, previous);
    },

    async removeItem(key: string): Promise<void> {
      const meta = await readMeta(key);
      if (meta) await deleteChunks(key, meta);
      await store.deleteItemAsync(key);
    },
  };
}

export const secureSessionStorage = createChunkedSecureStorage(SecureStore);
