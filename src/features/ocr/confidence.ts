import type { Recognition, RecognizedLine } from './recognitionSchema';

/** Lines below this confidence are flagged for the user to double-check. */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

function countCharacters(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * Overall confidence of a recognition, 0 to 1. Each line is weighted by its number of
 * non-space characters so a long paragraph counts for more than a stray label.
 * Returns null when there is no text, because "0%" would wrongly suggest a bad read.
 */
export function aggregateConfidence(recognition: Recognition): number | null {
  let weighted = 0;
  let weight = 0;
  for (const block of recognition.blocks) {
    for (const line of block.lines) {
      const characters = countCharacters(line.text);
      weighted += line.confidence * characters;
      weight += characters;
    }
  }
  return weight === 0 ? null : weighted / weight;
}

export function isLowConfidence(line: Pick<RecognizedLine, 'confidence'>): boolean {
  return line.confidence < LOW_CONFIDENCE_THRESHOLD;
}

/** "93%" or "No text" when there is nothing to score. */
export function formatConfidence(confidence: number | null): string {
  return confidence === null ? 'No text' : `${Math.round(confidence * 100)}%`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
