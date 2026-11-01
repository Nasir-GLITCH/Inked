import type { Recognition } from './recognitionSchema';

const frame = { left: 0, top: 0, right: 10, bottom: 10 };

export function makeLine(text: string, confidence: number) {
  return {
    text,
    confidence,
    angle: 0,
    frame,
    elements: text
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({ text: word, confidence, frame })),
  };
}

export function makeRecognition(lines: { text: string; confidence: number }[]): Recognition {
  return {
    text: lines.map((line) => line.text).join('\n'),
    imageWidth: 1000,
    imageHeight: 1400,
    durationMs: 250,
    blocks: [
      {
        text: lines.map((l) => l.text).join('\n'),
        frame,
        lines: lines.map((l) => makeLine(l.text, l.confidence)),
      },
    ],
  };
}
