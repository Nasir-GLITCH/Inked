import type { RecognizedLine } from '@/features/ocr/recognitionSchema';

export type DisplayBox = { left: number; top: number; width: number; height: number };

/**
 * Converts a line's pixel frame (in image coordinates) to a box on a display that shows the
 * whole image scaled to `displayWidth`. Returns null when the image or display has no size.
 */
export function scaleFrame(
  frame: RecognizedLine['frame'],
  imageWidth: number,
  displayWidth: number,
): DisplayBox | null {
  if (imageWidth <= 0 || displayWidth <= 0) return null;
  const scale = displayWidth / imageWidth;
  const width = (frame.right - frame.left) * scale;
  const height = (frame.bottom - frame.top) * scale;
  if (width <= 0 || height <= 0) return null;
  return { left: frame.left * scale, top: frame.top * scale, width, height };
}
