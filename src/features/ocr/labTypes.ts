import type { CloudFailureCode } from './cloudOcrService';
import type { OcrFailureCode } from './ocrService';
import type { Recognition } from './recognitionSchema';

export type LabCloudResult =
  | { status: 'running' }
  | { status: 'done'; text: string; model: string; durationMs: number }
  | { status: 'failed'; failureCode: CloudFailureCode };

export type LabPage = {
  id: string;
  uri: string;
  /** On-device engine (ML Kit). */
  status: 'queued' | 'running' | 'done' | 'failed';
  recognition?: Recognition;
  failureCode?: OcrFailureCode;
  /** Cloud engine (Gemini). Absent until the on-device pass has finished. */
  cloud?: LabCloudResult;
};
