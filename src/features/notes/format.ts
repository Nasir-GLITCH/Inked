import type { Note } from '@/db/noteRepository';

/** Locale-aware short date, e.g. "Nov 24, 2026". Falls back to an empty string for bad input. */
export function formatNoteDate(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/** Badge text for a note: cloud text has no score, on-device shows its real confidence. */
export function noteBadge(note: Pick<Note, 'engine' | 'confidence'>): string {
  if (note.engine === 'cloud') return 'CLOUD TEXT';
  return note.confidence === null ? 'ON-DEVICE' : `${(note.confidence * 100).toFixed(1)}% CONF`;
}

/**
 * Text to show under the title in lists. Skips the title line; a single-line note has no
 * excerpt unless its title was shortened, in which case the full line is shown.
 */
export function noteExcerpt(note: Pick<Note, 'title' | 'body'>, maxLength = 160): string {
  const lines = note.body.split('\n').filter((line) => line.trim() !== '');
  if (lines.length <= 1 && !note.title.endsWith('…')) return '';
  const rest = (lines.length > 1 ? lines.slice(1) : lines).join(' ').replace(/\s+/g, ' ').trim();
  return rest.length > maxLength ? `${rest.slice(0, maxLength - 1).trimEnd()}…` : rest;
}
