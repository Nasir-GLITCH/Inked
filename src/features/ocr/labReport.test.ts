import { makeRecognition } from './fixtures';
import { formatLabReport } from './labReport';
import type { LabPage } from './labTypes';

const donePage: LabPage = {
  id: '1',
  uri: 'file:///a.jpg',
  status: 'done',
  recognition: makeRecognition([
    { text: 'Clear line', confidence: 0.95 },
    { text: 'Smudged line', confidence: 0.4 },
  ]),
};

describe('formatLabReport', () => {
  it('includes stats and per-line confidence, marking low-confidence lines', () => {
    const report = formatLabReport([donePage]);
    expect(report).toContain('--- Page 1 ---');
    expect(report).toContain('Time: 250 ms');
    expect(report).toContain('Words: 4');
    expect(report).toContain('(95%) Clear line');
    expect(report).toContain('[?] (40%) Smudged line');
    expect(report).not.toContain('[?] (95%)');
  });

  it('reports failed and unprocessed pages', () => {
    const report = formatLabReport([
      { id: '2', uri: 'x', status: 'failed', failureCode: 'image_unreadable' },
      { id: '3', uri: 'y', status: 'queued' },
    ]);
    expect(report).toContain('Failed: This image could not be opened.');
    expect(report).toContain('Not processed');
  });
});
