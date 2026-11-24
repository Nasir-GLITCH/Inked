import { persistPageImage, removePageImage } from './pageImageStorage';

const mockCopy = jest.fn();
const mockDelete = jest.fn();
const mockCreate = jest.fn();
let mockExists = true;

jest.mock('expo-file-system', () => {
  class Directory {
    parts: unknown[];
    constructor(...parts: unknown[]) {
      this.parts = parts;
    }
    create(options: unknown) {
      mockCreate(options);
    }
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = parts
        .map((part) =>
          typeof part === 'string'
            ? part
            : `dir:${((part as Directory).parts ?? []).slice(1).join('/')}`,
        )
        .join('/');
    }
    get exists() {
      return mockExists;
    }
    copy(destination: unknown) {
      return mockCopy(this.uri, destination);
    }
    delete() {
      mockDelete(this.uri);
    }
  }
  return { Directory, File, Paths: { document: 'doc' } };
});

describe('persistPageImage', () => {
  beforeEach(() => {
    mockCopy.mockReset().mockResolvedValue(undefined);
    mockCreate.mockReset();
  });

  it('copies the page into a per-user folder named after the note', async () => {
    const uri = await persistPageImage('user-1', 'note-9', 'file:///cache/scan.PNG');

    expect(mockCreate).toHaveBeenCalledWith({ intermediates: true, idempotent: true });
    expect(mockCopy).toHaveBeenCalledWith('file:///cache/scan.PNG', expect.anything());
    expect(uri).toBe('dir:pages/user-1/note-9.png');
  });

  it('defaults to jpg for unknown extensions', async () => {
    const uri = await persistPageImage('u', 'n', 'content://media/external/images/42');
    expect(uri.endsWith('/n.jpg')).toBe(true);
  });
});

describe('removePageImage', () => {
  beforeEach(() => {
    mockDelete.mockReset();
    mockExists = true;
  });

  it('deletes an existing file', () => {
    expect(removePageImage('file:///a.jpg')).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('file:///a.jpg');
  });

  it('succeeds without deleting when the file is already gone', () => {
    mockExists = false;
    expect(removePageImage('file:///a.jpg')).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('reports failure instead of throwing', () => {
    mockDelete.mockImplementation(() => {
      throw new Error('locked');
    });
    expect(removePageImage('file:///a.jpg')).toBe(false);
  });
});
