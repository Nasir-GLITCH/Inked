import { z } from 'zod';

const frameSchema = z.object({
  left: z.number(),
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
});

const confidenceSchema = z.number().min(0).max(1);

const elementSchema = z.object({
  text: z.string(),
  confidence: confidenceSchema,
  frame: frameSchema,
});

const lineSchema = z.object({
  text: z.string(),
  confidence: confidenceSchema,
  angle: z.number(),
  frame: frameSchema,
  elements: z.array(elementSchema),
});

const blockSchema = z.object({
  text: z.string(),
  frame: frameSchema,
  lines: z.array(lineSchema),
});

const recognitionSchema = z.object({
  text: z.string(),
  imageWidth: z.number().int().nonnegative(),
  imageHeight: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  blocks: z.array(blockSchema),
});

export type Recognition = z.infer<typeof recognitionSchema>;
export type RecognizedLine = z.infer<typeof lineSchema>;

/**
 * Validates the untrusted result of the native recognizer.
 * Returns null when it does not match the expected shape.
 */
export function parseRecognition(raw: unknown): Recognition | null {
  const parsed = recognitionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
