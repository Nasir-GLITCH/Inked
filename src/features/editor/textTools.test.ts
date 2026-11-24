import { fixLigatures, trimSpaces } from './textTools';

describe('fixLigatures', () => {
  it('replaces ligatures and the long s with plain letters', () => {
    expect(fixLigatures('ﬁnal ﬂow oﬃce ﬀ ﬄ ﬅ ﬆ')).toBe('final flow office ff ffl st st');
    expect(fixLigatures('Deſcription')).toBe('Description');
  });

  it('leaves normal text alone', () => {
    expect(fixLigatures('Plain text, 123.')).toBe('Plain text, 123.');
  });
});

describe('trimSpaces', () => {
  it('collapses spaces and tabs and trims line ends', () => {
    expect(trimSpaces('a   b\t\tc  \n  d  ')).toBe('a b c\nd');
  });

  it('limits blank lines to one', () => {
    expect(trimSpaces('one\n\n\n\n two')).toBe('one\n\ntwo');
  });

  it('normalizes Windows line endings and trims the ends', () => {
    expect(trimSpaces('\r\n  a\r\nb  \r\n')).toBe('a\nb');
  });

  it('is stable when run twice', () => {
    const once = trimSpaces(' a  b \n\n\n c ');
    expect(trimSpaces(once)).toBe(once);
  });
});
