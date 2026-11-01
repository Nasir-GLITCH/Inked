import {
  aggregateConfidence,
  countWords,
  formatConfidence,
  isLowConfidence,
  LOW_CONFIDENCE_THRESHOLD,
} from './confidence';
import { makeRecognition } from './fixtures';

describe('aggregateConfidence', () => {
  it('weights lines by their number of non-space characters', () => {
    // 10 chars at 1.0 and 30 chars at 0.6 => (10 + 18) / 40 = 0.7
    const recognition = makeRecognition([
      { text: 'aaaa aaaaa a', confidence: 1 },
      { text: 'bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb', confidence: 0.6 },
    ]);
    expect(aggregateConfidence(recognition)).toBeCloseTo((10 * 1 + 30 * 0.6) / 40, 5);
  });

  it('returns null when nothing was recognized', () => {
    expect(aggregateConfidence(makeRecognition([]))).toBeNull();
  });

  it('returns null when lines contain only whitespace', () => {
    expect(aggregateConfidence(makeRecognition([{ text: '   ', confidence: 0.9 }]))).toBeNull();
  });
});

describe('isLowConfidence', () => {
  it('flags lines below the threshold only', () => {
    expect(isLowConfidence({ confidence: LOW_CONFIDENCE_THRESHOLD - 0.01 })).toBe(true);
    expect(isLowConfidence({ confidence: LOW_CONFIDENCE_THRESHOLD })).toBe(false);
  });
});

describe('formatConfidence', () => {
  it('rounds to a whole percentage', () => {
    expect(formatConfidence(0.934)).toBe('93%');
    expect(formatConfidence(1)).toBe('100%');
    expect(formatConfidence(0)).toBe('0%');
  });

  it('says "No text" for null', () => {
    expect(formatConfidence(null)).toBe('No text');
  });
});

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('hello  big\nworld ')).toBe(3);
  });

  it('is zero for empty or blank text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  \n ')).toBe(0);
  });
});
