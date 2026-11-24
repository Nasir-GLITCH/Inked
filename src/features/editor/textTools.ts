const LIGATURES: Record<string, string> = {
  ﬀ: 'ff',
  ﬁ: 'fi',
  ﬂ: 'fl',
  ﬃ: 'ffi',
  ﬄ: 'ffl',
  ﬅ: 'st',
  ﬆ: 'st',
  // Long s, common in older printed texts.
  ſ: 's',
};

const LIGATURE_PATTERN = new RegExp(`[${Object.keys(LIGATURES).join('')}]`, 'g');

/** Replaces ligature characters (ﬁ ﬂ ﬃ …) and the long s (ſ) with plain letters. */
export function fixLigatures(text: string): string {
  return text.replace(LIGATURE_PATTERN, (match) => LIGATURES[match] ?? match);
}

/**
 * Cleans whitespace: removes spaces at line ends, collapses runs of spaces and tabs,
 * limits blank lines to one and trims the start and end.
 */
export function trimSpaces(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
