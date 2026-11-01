import InkedOcr from '@modules/inked-ocr';

import { parseRecognition, type Recognition } from './recognitionSchema';

export type OcrFailureCode =
  'unavailable' | 'image_unreadable' | 'recognition_failed' | 'invalid_result';

export type OcrResult =
  { ok: true; recognition: Recognition } | { ok: false; code: OcrFailureCode };

function failureCodeFor(error: unknown): OcrFailureCode {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  if (code === 'E_IMAGE_UNREADABLE' || code === 'E_INVALID_URI') return 'image_unreadable';
  return 'recognition_failed';
}

/** Reads the text in a local image on the device. Never throws. */
export async function recognizeText(imageUri: string): Promise<OcrResult> {
  if (InkedOcr === null) {
    return { ok: false, code: 'unavailable' };
  }
  try {
    const raw: unknown = await InkedOcr.recognizeText(imageUri);
    const recognition = parseRecognition(raw);
    return recognition ? { ok: true, recognition } : { ok: false, code: 'invalid_result' };
  } catch (error) {
    return { ok: false, code: failureCodeFor(error) };
  }
}

const FAILURE_MESSAGES: Record<OcrFailureCode, string> = {
  unavailable: 'Text recognition is not available in this build of the app.',
  image_unreadable: 'This image could not be opened.',
  recognition_failed: 'Text recognition failed. Please try again.',
  invalid_result: 'Text recognition returned an unexpected result.',
};

export function ocrFailureMessage(code: OcrFailureCode): string {
  return FAILURE_MESSAGES[code];
}
