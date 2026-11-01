import { useCallback, useEffect, useRef, useState } from 'react';

import { scanFailureMessage, scanPages } from '@/features/capture/documentScanner';

import type { LabPage } from './labTypes';
import { recognizeText } from './ocrService';

/**
 * State for the developer OCR lab: scan pages, then read them one at a time
 * (one at a time keeps memory use and per-page timings honest).
 */
export function useOcrLab() {
  const [pages, setPages] = useState<LabPage[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updatePage = useCallback((id: string, patch: Partial<LabPage>) => {
    if (!mountedRef.current) return;
    setPages((current) => current.map((page) => (page.id === id ? { ...page, ...patch } : page)));
  }, []);

  const scanAndRecognize = useCallback(async () => {
    if (busyRef.current) return; // ignore repeated taps while a run is in progress
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const scan = await scanPages();
      if (!mountedRef.current) return;
      if (scan.status === 'cancelled') return;
      if (scan.status === 'error') {
        setNotice(scanFailureMessage(scan.code));
        return;
      }

      const batch: LabPage[] = scan.imageUris.map((uri, index) => ({
        id: `${Date.now()}-${index}`,
        uri,
        status: 'queued',
      }));
      setPages(batch);

      for (const page of batch) {
        if (!mountedRef.current) return;
        updatePage(page.id, { status: 'running' });
        const result = await recognizeText(page.uri);
        updatePage(
          page.id,
          result.ok
            ? { status: 'done', recognition: result.recognition }
            : { status: 'failed', failureCode: result.code },
        );
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [updatePage]);

  return { pages, busy, notice, scanAndRecognize };
}
