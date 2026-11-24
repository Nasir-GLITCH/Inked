import { useEffect, useReducer, useState } from 'react';

import { recognizeTextInCloud } from '@/features/ocr/cloudOcrService';
import { recognizeText } from '@/features/ocr/ocrService';

import { draftReducer, initialDraft } from './draftReducer';

/**
 * Reads one page with both engines. The on-device result appears first; the cloud result
 * follows and is applied by the reducer (see draftReducer for the rules).
 */
export function useTranscriptionDraft(imageUri: string) {
  const [state, dispatch] = useReducer(draftReducer, initialDraft);
  const [cloudAttempt, setCloudAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    recognizeText(imageUri).then((result) => {
      if (!active) return;
      dispatch(
        result.ok
          ? { type: 'onDeviceDone', recognition: result.recognition }
          : { type: 'onDeviceFailed', code: result.code },
      );
    });
    return () => {
      active = false;
    };
  }, [imageUri]);

  useEffect(() => {
    let active = true;
    recognizeTextInCloud(imageUri).then((result) => {
      if (!active) return;
      dispatch(
        result.ok
          ? { type: 'cloudDone', text: result.text, model: result.model }
          : { type: 'cloudFailed', code: result.code },
      );
    });
    return () => {
      active = false;
    };
  }, [imageUri, cloudAttempt]);

  return {
    state,
    edit: (text: string) => dispatch({ type: 'edit', text }),
    applyCloudText: () => dispatch({ type: 'useCloudText' }),
    retryCloud: () => {
      dispatch({ type: 'cloudRetry' });
      setCloudAttempt((attempt) => attempt + 1);
    },
  };
}
