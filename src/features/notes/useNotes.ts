import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { Category } from '@/db/categoryRepository';
import { useDatabase } from '@/db/DatabaseProvider';
import type { Note } from '@/db/noteRepository';

export type NotesState =
  | { status: 'loading' }
  | { status: 'ready'; notes: Note[]; categories: Category[] }
  | { status: 'error' };

/**
 * Loads the signed-in user's notes (optionally one category) and categories from the
 * on-device database. Reloads whenever the screen regains focus, so a note saved on
 * another screen shows up straight away.
 */
export function useNotes(categoryId: string | null) {
  const database = useDatabase();
  const [loaded, setLoaded] = useState<NotesState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useFocusEffect(useCallback(() => setVersion((v) => v + 1), []));

  useEffect(() => {
    if (database.status !== 'ready') return;
    let active = true;
    const { notes, categories } = database.repositories;
    Promise.all([notes.list(categoryId ? { categoryId } : {}), categories.list()])
      .then(([noteList, categoryList]) => {
        if (active) setLoaded({ status: 'ready', notes: noteList, categories: categoryList });
      })
      .catch(() => {
        if (active) setLoaded({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [database, categoryId, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const state: NotesState = database.status === 'error' ? { status: 'error' } : loaded;
  return { state, reload };
}
