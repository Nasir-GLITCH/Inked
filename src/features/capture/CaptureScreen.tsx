import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';

export function CaptureScreen() {
  return (
    <Screen title="Capture" subtitle="Scan pages and extract their text">
      <EmptyState
        icon="document-scanner"
        title="Scanning is not available yet"
        message="Camera capture and text recognition are being built. This screen will open the scanner."
      />
    </Screen>
  );
}
