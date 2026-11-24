import { useCallback, useEffect, useState } from 'react';

import type { Category } from '@/db/categoryRepository';
import { useDatabase } from '@/db/DatabaseProvider';

export type CategoriesState =
  { status: 'loading' } | { status: 'ready'; categories: Category[] } | { status: 'error' };

/** Loads the signed-in user's categories (with note counts) from the on-device database. */
export function useCategories() {
  const database = useDatabase();
  const [loaded, setLoaded] = useState<CategoriesState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (database.status !== 'ready') return;
    let active = true;
    database.repositories.categories
      .list()
      .then((categories) => {
        if (active) setLoaded({ status: 'ready', categories });
      })
      .catch(() => {
        if (active) setLoaded({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [database, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const state: CategoriesState = database.status === 'error' ? { status: 'error' } : loaded;
  return { state, reload };
}
