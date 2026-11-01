import { makeRecognition } from './fixtures';
import { ocrFailureMessage, recognizeText } from './ocrService';

const mockRecognizeText = jest.fn();

jest.mock('@modules/inked-ocr', () => ({
  __esModule: true,
  default: { recognizeText: (...args: unknown[]) => mockRecognizeText(...args) },
}));

describe('recognizeText', () => {
  beforeEach(() => mockRecognizeText.mockReset());

  it('returns the validated recognition', async () => {
    const recognition = makeRecognition([{ text: 'Hello', confidence: 0.95 }]);
    mockRecognizeText.mockResolvedValue(recognition);

    await expect(recognizeText('file:///page.jpg')).resolves.toEqual({ ok: true, recognition });
    expect(mockRecognizeText).toHaveBeenCalledWith('file:///page.jpg');
  });

  it('reports an invalid native result', async () => {
    mockRecognizeText.mockResolvedValue({ nonsense: true });
    await expect(recognizeText('file:///page.jpg')).resolves.toEqual({
      ok: false,
      code: 'invalid_result',
    });
  });

  it.each(['E_IMAGE_UNREADABLE', 'E_INVALID_URI'])('maps %s to image_unreadable', async (code) => {
    mockRecognizeText.mockRejectedValue({ code });
    await expect(recognizeText('x')).resolves.toEqual({ ok: false, code: 'image_unreadable' });
  });

  it('maps other failures to recognition_failed without throwing', async () => {
    mockRecognizeText.mockRejectedValue(new Error('boom'));
    await expect(recognizeText('x')).resolves.toEqual({ ok: false, code: 'recognition_failed' });
  });

  it('has a user-facing message for every failure', () => {
    for (const code of [
      'unavailable',
      'image_unreadable',
      'recognition_failed',
      'invalid_result',
    ] as const) {
      expect(ocrFailureMessage(code)).not.toBe('');
    }
  });
});

describe('recognizeText when the native module is missing', () => {
  it('reports unavailable', async () => {
    jest.resetModules();
    jest.doMock('@modules/inked-ocr', () => ({ __esModule: true, default: null }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { recognizeText: isolated } = require('./ocrService') as typeof import('./ocrService');
    await expect(isolated('x')).resolves.toEqual({ ok: false, code: 'unavailable' });
  });
});
