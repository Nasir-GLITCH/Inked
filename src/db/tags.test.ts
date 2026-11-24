import { MAX_TAG_LENGTH, MAX_TAGS_PER_NOTE, normalizeTag, normalizeTags } from './tags';

describe('normalizeTag', () => {
  it.each([
    ['#Epistemology', 'epistemology'],
    ['  my tag  ', 'my-tag'],
    ['##Books!!', 'books'],
    ['a   b', 'a-b'],
    ['snake_case', 'snake_case'],
    ['Éthique', 'éthique'],
  ])('turns %j into %j', (raw, expected) => {
    expect(normalizeTag(raw)).toBe(expected);
  });

  it('returns null when nothing usable is left', () => {
    expect(normalizeTag('   ')).toBeNull();
    expect(normalizeTag('#')).toBeNull();
    expect(normalizeTag('!!!')).toBeNull();
  });

  it('shortens very long tags', () => {
    expect(normalizeTag('x'.repeat(100))).toHaveLength(MAX_TAG_LENGTH);
  });
});

describe('normalizeTags', () => {
  it('removes duplicates and unusable tags, keeping order', () => {
    expect(normalizeTags(['#Books', 'books', '', 'Notes'])).toEqual(['books', 'notes']);
  });

  it('keeps at most the maximum number of tags', () => {
    const many = Array.from({ length: 25 }, (_, i) => `tag${i}`);
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS_PER_NOTE);
  });
});
