import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { createCategoryRepository, type CategoryRepository } from './categoryRepository';
import { createNoteRepository, type NoteRepository } from './noteRepository';
import { openUserDatabase } from './openDatabase';

export type Repositories = {
  userId: string;
  notes: NoteRepository;
  categories: CategoryRepository;
};

export type DatabaseState =
  { status: 'loading' } | { status: 'ready'; repositories: Repositories } | { status: 'error' };

const DatabaseContext = createContext<DatabaseState>({ status: 'loading' });

/**
 * Opens the signed-in user's on-device database and provides its repositories.
 * Mount it inside AuthProvider; it opens a different file for each user.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [opened, setOpened] = useState<{ userId: string; repositories: Repositories } | 'error'>();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    openUserDatabase(userId)
      .then((db) => {
        if (!active) return;
        setOpened({
          userId,
          repositories: {
            userId,
            notes: createNoteRepository(db),
            categories: createCategoryRepository(db),
          },
        });
      })
      .catch(() => {
        if (active) setOpened('error');
      });
    return () => {
      active = false;
      setOpened(undefined);
    };
  }, [userId]);

  const value = useMemo<DatabaseState>(() => {
    if (opened === 'error') return { status: 'error' };
    if (opened && opened.userId === userId) {
      return { status: 'ready', repositories: opened.repositories };
    }
    return { status: 'loading' };
  }, [opened, userId]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): DatabaseState {
  return useContext(DatabaseContext);
}
