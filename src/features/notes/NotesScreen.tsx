import { useRouter } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { ProfileButton } from '@/features/profile/ProfileButton';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotesScreen() {
  const router = useRouter();

  return (
    <Screen
      title="Notes"
      subtitle="Your scanned folios and transcriptions"
      headerRight={<ProfileButton />}>
      <EmptyState
        icon="description"
        title="No notes yet"
        message="Scan a page to create your first note. It will appear here once it has been transcribed."
        action={{ label: 'Scan a page', onPress: () => router.navigate('/capture') }}
      />
    </Screen>
  );
}
