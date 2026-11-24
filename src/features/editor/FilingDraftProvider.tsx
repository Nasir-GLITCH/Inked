import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { DraftEngine } from './draftReducer';

/** A proofread page waiting to be filed (given a category and tags) and saved. */
export type FilingDraft = {
  imageUri: string;
  text: string;
  memo: string;
  engine: DraftEngine;
  /** 0 to 1, only for on-device text. */
  confidence: number | null;
  /** Dimensions of the page image, when known, for display. */
  imageWidth: number | null;
  imageHeight: number | null;
};

type FilingDraftContextValue = {
  draft: FilingDraft | null;
  setDraft: (draft: FilingDraft | null) => void;
};

const FilingDraftContext = createContext<FilingDraftContextValue | undefined>(undefined);

/**
 * Carries the confirmed text from the Transcription Editor to the Filing screen.
 * Kept in memory only: it is cleared after saving or discarding.
 */
export function FilingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<FilingDraft | null>(null);
  const value = useMemo(() => ({ draft, setDraft }), [draft]);
  return <FilingDraftContext.Provider value={value}>{children}</FilingDraftContext.Provider>;
}

export function useFilingDraft(): FilingDraftContextValue {
  const context = useContext(FilingDraftContext);
  if (!context) throw new Error('useFilingDraft must be used inside FilingDraftProvider');
  return context;
}
