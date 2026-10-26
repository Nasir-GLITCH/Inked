import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';

export function LibraryScreen() {
  return (
    <Screen title="Library" subtitle="Your collections and archive">
      <EmptyState
        icon="folder-open"
        title="Your library is empty"
        message="Collections you create and notes you file will be organised here."
      />
    </Screen>
  );
}
