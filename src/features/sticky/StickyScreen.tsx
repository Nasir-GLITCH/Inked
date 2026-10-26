import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';

export function StickyScreen() {
  return (
    <Screen title="Sticky Notes" subtitle="Quick snippets, saved lines and jottings">
      <EmptyState
        icon="sticky-note-2"
        title="No sticky notes yet"
        message="Quotes and ideas you save from your notes will be collected here."
      />
    </Screen>
  );
}
