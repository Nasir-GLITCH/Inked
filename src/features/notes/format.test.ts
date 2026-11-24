import { formatNoteDate, noteBadge, noteExcerpt } from './format';

describe('formatNoteDate', () => {
  it('formats a valid ISO date', () => {
    expect(formatNoteDate('2026-11-24T10:00:00.000Z', 'en-US')).toBe('Nov 24, 2026');
  });
  it('returns an empty string for invalid input', () => {
    expect(formatNoteDate('not a date')).toBe('');
  });
});

describe('noteBadge', () => {
  it('shows CLOUD TEXT without a percentage for cloud notes', () => {
    expect(noteBadge({ engine: 'cloud', confidence: null })).toBe('CLOUD TEXT');
  });
  it('shows the real confidence for on-device notes', () => {
    expect(noteBadge({ engine: 'on_device', confidence: 0.838 })).toBe('83.8% CONF');
  });
  it('shows ON-DEVICE when there is no score', () => {
    expect(noteBadge({ engine: 'on_device', confidence: null })).toBe('ON-DEVICE');
  });
});

describe('noteExcerpt', () => {
  it('skips the title line and joins the rest', () => {
    expect(noteExcerpt({ title: 'T', body: 'Title\nsecond  line\nthird' })).toBe(
      'second line third',
    );
  });
  it('has no excerpt for a one-line note, since the title already shows it', () => {
    expect(noteExcerpt({ title: 'Only line', body: 'Only line' })).toBe('');
  });
  it('shows the full line when a one-line note title was shortened', () => {
    expect(noteExcerpt({ title: 'Only…', body: 'Only line here' })).toBe('Only line here');
  });
  it('shortens long text with an ellipsis', () => {
    const result = noteExcerpt({ title: 'T', body: `Title\n${'a'.repeat(300)}` }, 20);
    expect(result).toHaveLength(20);
    expect(result.endsWith('…')).toBe(true);
  });
});
