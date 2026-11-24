import { useLocalSearchParams } from 'expo-router';

import { NoteDetailScreen } from '@/features/notes/NoteDetailScreen';

export default function NoteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NoteDetailScreen id={id} />;
}
