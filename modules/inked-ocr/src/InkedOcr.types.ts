/**
 * Raw result of the native recognizer. This is untrusted input from the native side:
 * parse it with `parseRecognition` (src/features/ocr/recognitionSchema.ts) before use.
 * Pixel coordinates refer to the image after EXIF rotation.
 */
export type NativeFrame = { left: number; top: number; right: number; bottom: number };

export type NativeElement = { text: string; confidence: number; frame: NativeFrame };

export type NativeLine = {
  text: string;
  /** 0 to 1. */
  confidence: number;
  /** Rotation in degrees, clockwise positive. */
  angle: number;
  frame: NativeFrame;
  elements: NativeElement[];
};

export type NativeBlock = { text: string; frame: NativeFrame; lines: NativeLine[] };

export type NativeRecognition = {
  text: string;
  imageWidth: number;
  imageHeight: number;
  durationMs: number;
  blocks: NativeBlock[];
};
