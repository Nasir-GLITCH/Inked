import {
  CHUNK_SIZE,
  createChunkedSecureStorage,
  splitIntoChunks,
  type SecureStoreLike,
} from '@/services/secureSessionStorage';

/** In-memory SecureStore that also enforces the real ~2 KB per-value limit. */
function createFakeStore() {
  const data = new Map<string, string>();
  const store: SecureStoreLike = {
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (new TextEncoder().encode(value).length > 2048) {
        throw new Error(`value for ${key} exceeds 2048 bytes`);
      }
      if (!/^[A-Za-z0-9._-]+$/.test(key)) {
        throw new Error(`invalid SecureStore key: ${key}`);
      }
      data.set(key, value);
    },
    deleteItemAsync: async (key) => {
      data.delete(key);
    },
  };
  return { store, data };
}

const KEY = 'sb-testref-auth-token';

describe('splitIntoChunks', () => {
  it('returns no chunks for an empty string', () => {
    expect(splitIntoChunks('')).toEqual([]);
  });

  it('splits at the chunk size and rejoins losslessly', () => {
    const value = 'a'.repeat(CHUNK_SIZE * 2 + 7);
    const chunks = splitIntoChunks(value);
    expect(chunks.map((chunk) => chunk.length)).toEqual([CHUNK_SIZE, CHUNK_SIZE, 7]);
    expect(chunks.join('')).toBe(value);
  });
});

describe('chunked secure storage', () => {
  it('returns null when nothing is stored', async () => {
    const { store } = createFakeStore();
    expect(await createChunkedSecureStorage(store).getItem(KEY)).toBeNull();
  });

  it('round-trips a session far larger than the 2 KB SecureStore limit', async () => {
    const { store } = createFakeStore();
    const storage = createChunkedSecureStorage(store);
    const session = JSON.stringify({ access_token: 'x'.repeat(4000), user: { id: 'u1' } });

    await storage.setItem(KEY, session);

    expect(await storage.getItem(KEY)).toBe(session);
  });

  it('round-trips multi-byte text without exceeding the byte limit', async () => {
    const { store } = createFakeStore();
    const storage = createChunkedSecureStorage(store);
    const session = JSON.stringify({ name: '日本語🙂'.repeat(600) });

    await storage.setItem(KEY, session);

    expect(await storage.getItem(KEY)).toBe(session);
  });

  it('replaces the old session and leaves no stale chunks behind', async () => {
    const { store, data } = createFakeStore();
    const storage = createChunkedSecureStorage(store);

    await storage.setItem(KEY, 'a'.repeat(3000));
    await storage.setItem(KEY, 'short session');

    expect(await storage.getItem(KEY)).toBe('short session');
    // Only the meta entry and one chunk remain.
    expect([...data.keys()]).toHaveLength(2);
  });

  it('removeItem deletes the meta entry and every chunk', async () => {
    const { store, data } = createFakeStore();
    const storage = createChunkedSecureStorage(store);
    await storage.setItem(KEY, 'a'.repeat(3000));

    await storage.removeItem(KEY);

    expect(await storage.getItem(KEY)).toBeNull();
    expect(data.size).toBe(0);
  });

  it('removeItem on a missing key does not throw', async () => {
    const { store } = createFakeStore();
    await expect(createChunkedSecureStorage(store).removeItem(KEY)).resolves.toBeUndefined();
  });

  it('returns null (signed out) when a chunk is missing', async () => {
    const { store, data } = createFakeStore();
    const storage = createChunkedSecureStorage(store);
    await storage.setItem(KEY, 'a'.repeat(1200));
    const firstChunkKey = [...data.keys()].find((key) => key.endsWith('.0'));
    data.delete(firstChunkKey as string);

    expect(await storage.getItem(KEY)).toBeNull();
  });

  it.each([
    ['not JSON', 'garbage'],
    ['wrong shape', JSON.stringify({ hello: 'world' })],
    ['negative count', JSON.stringify({ g: 'x', n: -1 })],
    ['absurd count', JSON.stringify({ g: 'x', n: 100000 })],
    ['JSON null', 'null'],
  ])('treats a corrupt meta entry (%s) as no session', async (_label, corrupt) => {
    const { store, data } = createFakeStore();
    data.set(KEY, corrupt);
    expect(await createChunkedSecureStorage(store).getItem(KEY)).toBeNull();
  });

  it('keeps the previous session readable if a write fails part-way', async () => {
    const { store, data } = createFakeStore();
    const storage = createChunkedSecureStorage(store);
    await storage.setItem(KEY, 'old session '.repeat(100));

    // Fail on the 2nd chunk write of the next save.
    const realSet = store.setItemAsync;
    let calls = 0;
    store.setItemAsync = async (key, value) => {
      calls += 1;
      if (calls === 2) throw new Error('disk full');
      return realSet(key, value);
    };

    await expect(storage.setItem(KEY, 'new session '.repeat(200))).rejects.toThrow('disk full');

    store.setItemAsync = realSet;
    expect(await storage.getItem(KEY)).toBe('old session '.repeat(100));
    expect(data.has(KEY)).toBe(true);
  });

  it('refuses a session too large to store rather than writing a partial one', async () => {
    const { store, data } = createFakeStore();
    const storage = createChunkedSecureStorage(store);

    await expect(storage.setItem(KEY, 'a'.repeat(CHUNK_SIZE * 41))).rejects.toThrow(/too large/);
    expect(data.size).toBe(0);
  });
});
