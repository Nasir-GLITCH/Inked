import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { TranscriptionEditorScreen } from '@/features/editor/TranscriptionEditorScreen';

export default function EditorRoute() {
  const { imageUri } = useLocalSearchParams<{ imageUri?: string }>();
  if (!imageUri) {
    return (
      <EmptyState
        icon="error-outline"
        title="No page to edit"
        message="Go back and capture a page first."
      />
    );
  }
  return <TranscriptionEditorScreen imageUri={imageUri} />;
}
