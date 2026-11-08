import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import {
  cloudFailureMessage,
  MAX_UPLOAD_BYTES,
  mimeTypeFor,
  recognizeTextInCloud,
  type CloudFailureCode,
} from './cloudOcrService';

const mockInvoke = jest.fn();
const mockBase64 = jest.fn();
let mockFileSize: number | null = 1000;

jest.mock('@/services/supabase', () => ({
  getSupabase: () => ({ functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } }),
}));
jest.mock('expo-file-system', () => ({
  File: class {
    get size() {
      return mockFileSize;
    }
    base64() {
      return mockBase64();
    }
  },
}));

describe('mimeTypeFor', () => {
  it('uses the file extension and defaults to jpeg', () => {
    expect(mimeTypeFor('file:///a.PNG')).toBe('image/png');
    expect(mimeTypeFor('file:///a.webp?x=1')).toBe('image/webp');
    expect(mimeTypeFor('file:///a.jpg')).toBe('image/jpeg');
    expect(mimeTypeFor('content://media/42')).toBe('image/jpeg');
  });
});

describe('recognizeTextInCloud', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockBase64.mockReset().mockResolvedValue('AAAA');
    mockFileSize = 1000;
  });

  it('sends the image and returns the transcription', async () => {
    mockInvoke.mockResolvedValue({
      data: { text: 'Hello world', model: 'gemini-x', durationMs: 900 },
      error: null,
    });

    await expect(recognizeTextInCloud('file:///a.jpg')).resolves.toEqual({
      ok: true,
      text: 'Hello world',
      model: 'gemini-x',
      durationMs: 900,
    });
    expect(mockInvoke).toHaveBeenCalledWith('ocr-cloud', {
      body: { imageBase64: 'AAAA', mimeType: 'image/jpeg' },
    });
  });

  it('refuses oversized images without uploading', async () => {
    mockFileSize = MAX_UPLOAD_BYTES + 1;
    await expect(recognizeTextInCloud('file:///big.jpg')).resolves.toEqual({
      ok: false,
      code: 'image_too_large',
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('reports an unreadable file', async () => {
    mockBase64.mockRejectedValue(new Error('missing'));
    await expect(recognizeTextInCloud('file:///gone.jpg')).resolves.toEqual({
      ok: false,
      code: 'image_unreadable',
    });
  });

  it('maps a network failure', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new Error('offline')),
    });
    await expect(recognizeTextInCloud('file:///a.jpg')).resolves.toEqual({
      ok: false,
      code: 'network',
    });
  });

  it.each([
    [429, 'rate_limited'],
    [413, 'image_too_large'],
    [500, 'unavailable'],
    [502, 'failed'],
  ] as const)('maps HTTP %i to %s', async (status, code) => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response('{}', { status })),
    });
    await expect(recognizeTextInCloud('file:///a.jpg')).resolves.toEqual({ ok: false, code });
  });

  it('rejects a malformed server response', async () => {
    mockInvoke.mockResolvedValue({ data: { nope: true }, error: null });
    await expect(recognizeTextInCloud('file:///a.jpg')).resolves.toEqual({
      ok: false,
      code: 'failed',
    });
  });

  it('never throws when invoke itself throws', async () => {
    mockInvoke.mockRejectedValue(new Error('boom'));
    await expect(recognizeTextInCloud('file:///a.jpg')).resolves.toEqual({
      ok: false,
      code: 'failed',
    });
  });

  it('has a message for every failure code', () => {
    const codes: CloudFailureCode[] = [
      'image_unreadable',
      'image_too_large',
      'network',
      'rate_limited',
      'unavailable',
      'failed',
    ];
    for (const code of codes) expect(cloudFailureMessage(code)).not.toBe('');
  });
});
