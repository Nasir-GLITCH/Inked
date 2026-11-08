import { aggregateConfidence, countWords, formatConfidence, isLowConfidence } from './confidence';
import { cloudFailureMessage } from './cloudOcrService';
import { ocrFailureMessage } from './ocrService';
import type { LabPage } from './labTypes';

/** Plain-text report of an OCR lab run, meant to be shared back to the developer. */
export function formatLabReport(pages: readonly LabPage[]): string {
  const sections = pages.map((page, index) => {
    const heading = `--- Page ${index + 1} ---`;
    if (page.status === 'failed') {
      return [
        heading,
        `On-device failed: ${ocrFailureMessage(page.failureCode ?? 'recognition_failed')}`,
        ...formatCloudSection(page),
      ].join('\n');
    }
    if (page.status !== 'done' || !page.recognition) {
      return `${heading}\nNot processed`;
    }
    const { recognition } = page;
    const cloudSection = formatCloudSection(page);
    const stats = [
      `Time: ${recognition.durationMs} ms`,
      `Words: ${countWords(recognition.text)}`,
      `Confidence: ${formatConfidence(aggregateConfidence(recognition))}`,
      `Image: ${recognition.imageWidth}x${recognition.imageHeight}`,
    ].join(' | ');
    const lines = recognition.blocks
      .flatMap((block) => block.lines)
      .map(
        (line) =>
          `${isLowConfidence(line) ? '[?] ' : ''}(${formatConfidence(line.confidence)}) ${line.text}`,
      );
    return [heading, 'ON-DEVICE (ML Kit)', stats, ...lines, ...cloudSection].join('\n');
  });
  return ['Inked OCR lab report', ...sections].join('\n\n');
}

function formatCloudSection(page: LabPage): string[] {
  const { cloud } = page;
  if (!cloud || cloud.status === 'running') return [];
  if (cloud.status === 'failed')
    return ['', `CLOUD failed: ${cloudFailureMessage(cloud.failureCode)}`];
  return [
    '',
    `CLOUD (${cloud.model})`,
    `Time: ${cloud.durationMs} ms | Words: ${countWords(cloud.text)}`,
    cloud.text,
  ];
}
