export const MAX_TAGS_PER_NOTE = 10;
export const MAX_TAG_LENGTH = 32;

/**
 * Normalizes a user-typed tag: trims, drops leading "#", lowercases, turns spaces into
 * hyphens and removes characters other than letters, digits, "-" and "_".
 * Returns null when nothing usable is left.
 */
export function normalizeTag(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_TAG_LENGTH);
  return cleaned === '' ? null : cleaned;
}

/** Normalizes, removes duplicates and keeps at most MAX_TAGS_PER_NOTE, in the order given. */
export function normalizeTags(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const value of raw) {
    const tag = normalizeTag(value);
    if (tag) seen.add(tag);
    if (seen.size === MAX_TAGS_PER_NOTE) break;
  }
  return [...seen];
}
