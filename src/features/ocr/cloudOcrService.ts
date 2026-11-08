import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { File } from 'expo-file-system';
import { z } from 'zod';

import { getSupabase } from '@/services/supabase';

export type CloudFailureCode =
  'image_unreadable' | 'image_too_large' | 'network' | 'rate_limited' | 'unavailable' | 'failed';

export type CloudOcrResult =
  | { ok: true; text: string; model: string; durationMs: number }
  | { ok: false; code: CloudFailureCode };

/** Keeps uploads reasonable; the server enforces its own cap too. */
export const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;

const responseSchema = z.object({
  text: z.string(),
  model: z.string(),
  durationMs: z.number().nonnegative(),
});

type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp';

/** The image type is taken from the file name; scanner and gallery photos are normally JPEG. */
export function mimeTypeFor(uri: string): SupportedMime {
  const path = uri.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function failureFromError(error: unknown): Promise<CloudFailureCode> {
  if (error instanceof FunctionsFetchError) return 'network';
  if (error instanceof FunctionsHttpError) {
    const status = error.context instanceof Response ? error.context.status : 0;
    if (status === 413) return 'image_too_large';
    if (status === 429) return 'rate_limited';
    if (status === 500 || status === 404) return 'unavailable';
  }
  return 'failed';
}

/** Transcribes a local image with the cloud engine (Gemini, via an edge function). Never throws. */
export async function recognizeTextInCloud(imageUri: string): Promise<CloudOcrResult> {
  let imageBase64: string;
  try {
    const file = new File(imageUri);
    if ((file.size ?? 0) > MAX_UPLOAD_BYTES) return { ok: false, code: 'image_too_large' };
    imageBase64 = await file.base64();
  } catch {
    return { ok: false, code: 'image_unreadable' };
  }

  try {
    const { data, error } = await getSupabase().functions.invoke('ocr-cloud', {
      body: { imageBase64, mimeType: mimeTypeFor(imageUri) },
    });
    if (error) return { ok: false, code: await failureFromError(error) };
    const parsed = responseSchema.safeParse(data);
    return parsed.success ? { ok: true, ...parsed.data } : { ok: false, code: 'failed' };
  } catch {
    return { ok: false, code: 'failed' };
  }
}

const FAILURE_MESSAGES: Record<CloudFailureCode, string> = {
  image_unreadable: 'This image could not be read for upload.',
  image_too_large: 'This image is too large to send. Try a smaller photo.',
  network: 'No connection. The cloud engine needs internet.',
  rate_limited: 'The cloud engine is busy or its free limit was reached. Try again later.',
  unavailable: 'The cloud engine is not set up on the server yet.',
  failed: 'The cloud engine could not read this page.',
};

export function cloudFailureMessage(code: CloudFailureCode): string {
  return FAILURE_MESSAGES[code];
}
