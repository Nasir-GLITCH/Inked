import { aggregateConfidence } from '@/features/ocr/confidence';
import type { CloudFailureCode } from '@/features/ocr/cloudOcrService';
import type { OcrFailureCode } from '@/features/ocr/ocrService';
import type { Recognition } from '@/features/ocr/recognitionSchema';

export type OnDeviceState =
  | { status: 'running' }
  | { status: 'done'; recognition: Recognition }
  | { status: 'failed'; code: OcrFailureCode };

export type CloudState =
  | { status: 'running' }
  | { status: 'done'; text: string; model: string }
  | { status: 'failed'; code: CloudFailureCode };

export type DraftEngine = 'on_device' | 'cloud';

export type DraftState = {
  /** What the user sees and edits. */
  text: string;
  /** Which engine produced the text the user started from; null until one finishes. */
  baseEngine: DraftEngine | null;
  /** True once the user has changed the text by hand or with a cleanup tool. */
  edited: boolean;
  onDevice: OnDeviceState;
  cloud: CloudState;
  /** Cloud text arrived after the user started editing, so it was not applied automatically. */
  cloudOffered: boolean;
};

export type DraftAction =
  | { type: 'onDeviceDone'; recognition: Recognition }
  | { type: 'onDeviceFailed'; code: OcrFailureCode }
  | { type: 'cloudDone'; text: string; model: string }
  | { type: 'cloudFailed'; code: CloudFailureCode }
  | { type: 'cloudRetry' }
  | { type: 'edit'; text: string }
  | { type: 'useCloudText' };

export const initialDraft: DraftState = {
  text: '',
  baseEngine: null,
  edited: false,
  onDevice: { status: 'running' },
  cloud: { status: 'running' },
  cloudOffered: false,
};

/**
 * Both engines run on the same page. The fast on-device text appears first; the cloud text
 * replaces it when it arrives, unless the user has already started editing, in which case
 * it is offered instead. Edits are never overwritten silently.
 */
export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'onDeviceDone': {
      const next: DraftState = {
        ...state,
        onDevice: { status: 'done', recognition: action.recognition },
      };
      // Cloud text (or the user's edits) always win over the on-device text.
      if (state.baseEngine === 'cloud' || state.edited) return next;
      return { ...next, text: action.recognition.text, baseEngine: 'on_device' };
    }
    case 'onDeviceFailed':
      return { ...state, onDevice: { status: 'failed', code: action.code } };
    case 'cloudDone': {
      const next: DraftState = {
        ...state,
        cloud: { status: 'done', text: action.text, model: action.model },
      };
      // An empty cloud result must not wipe out text the on-device engine found.
      if (action.text.trim() === '') return next;
      if (state.edited) return { ...next, cloudOffered: true };
      return { ...next, text: action.text, baseEngine: 'cloud' };
    }
    case 'cloudFailed':
      return { ...state, cloud: { status: 'failed', code: action.code } };
    case 'cloudRetry':
      return { ...state, cloud: { status: 'running' } };
    case 'edit':
      return { ...state, text: action.text, edited: action.text !== state.text || state.edited };
    case 'useCloudText':
      if (state.cloud.status !== 'done') return state;
      return {
        ...state,
        text: state.cloud.text,
        baseEngine: 'cloud',
        edited: false,
        cloudOffered: false,
      };
  }
}

export function isDraftBusy(state: DraftState): boolean {
  return state.onDevice.status === 'running' || state.cloud.status === 'running';
}

/** On-device confidence (0 to 1) of the text the user started from, or null for cloud text. */
export function draftConfidence(state: DraftState): number | null {
  if (state.baseEngine !== 'on_device' || state.onDevice.status !== 'done') return null;
  return aggregateConfidence(state.onDevice.recognition);
}
