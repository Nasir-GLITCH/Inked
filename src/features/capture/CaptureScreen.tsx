import { useRouter } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileButton } from '@/features/profile/ProfileButton';

export function CaptureScreen() {
  const router = useRouter();

  return (
    <Screen
      title="Capture"
      subtitle="Scan pages and extract their text"
      headerRight={<ProfileButton />}>
      <EmptyState
        icon="document-scanner"
        title="Scanning is not available yet"
        message="Camera capture and text recognition are being built. This screen will open the scanner."
      />
      {__DEV__ ? (
        <Button
          label="Open OCR lab (dev only)"
          variant="secondary"
          onPress={() => router.push('/ocr-lab')}
        />
      ) : null}
    </Screen>
  );
}
