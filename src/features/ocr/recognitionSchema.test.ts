import { makeRecognition } from './fixtures';
import { parseRecognition } from './recognitionSchema';

describe('parseRecognition', () => {
  it('accepts a well-formed result', () => {
    const recognition = makeRecognition([{ text: 'Hello world', confidence: 0.9 }]);
    expect(parseRecognition(recognition)).toEqual(recognition);
  });

  it('rejects non-objects', () => {
    expect(parseRecognition(null)).toBeNull();
    expect(parseRecognition('text')).toBeNull();
  });

  it('rejects a confidence outside 0 to 1', () => {
    const recognition = makeRecognition([{ text: 'Hello', confidence: 1.4 }]);
    expect(parseRecognition(recognition)).toBeNull();
  });

  it('rejects a result with missing fields', () => {
    expect(parseRecognition({ text: 'x', blocks: [] })).toBeNull();
  });
});
