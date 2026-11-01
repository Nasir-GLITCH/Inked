import type { OcrFailureCode } from './ocrService';
import type { Recognition } from './recognitionSchema';

export type LabPage = {
  id: string;
  uri: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  recognition?: Recognition;
  failureCode?: OcrFailureCode;
};
