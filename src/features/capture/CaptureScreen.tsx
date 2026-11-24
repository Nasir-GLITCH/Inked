import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { ProfileButton } from '@/features/profile/ProfileButton';
import { colors, radii, spacing } from '@/theme';

import { scanFailureMessage, scanPages, type ScanResult } from './documentScanner';
import { pickImages } from './imageImport';

/** Pages per capture for now; multi-page batches come with the Batch Queue. */
const PAGES_PER_CAPTURE = 1;

export function CaptureScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  /** Runs one capture source; ignores taps while one is already open. */
  async function capture(source: (maxPages: number) => Promise<ScanResult>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const result = await source(PAGES_PER_CAPTURE);
      if (result.status === 'error') {
        setNotice(scanFailureMessage(result.code));
        return;
      }
      const imageUri = result.status === 'success' ? result.imageUris[0] : undefined;
      if (imageUri) router.push({ pathname: '/editor', params: { imageUri } });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen
      title="Capture"
      subtitle="Scan a page and extract its text"
      headerRight={<ProfileButton />}>
      <View style={styles.content}>
        <Button
          label="Scan page"
          leadingIcon="document-scanner"
          onPress={() => capture(scanPages)}
          loading={busy}
        />
        <Button
          label="Import from gallery"
          variant="secondary"
          leadingIcon="photo-library"
          onPress={() => capture(pickImages)}
          loading={busy}
        />

        {notice ? (
          <View accessible accessibilityRole="alert" style={styles.alert}>
            <Text variant="bodySmall" color="danger">
              {notice}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Icon name="info-outline" color="textSecondary" size={20} />
          <Text variant="bodySmall" color="textSecondary" style={styles.infoText}>
            Pages are read on your phone first. For better accuracy, especially on handwriting, the
            page image is also sent to Google to be read in the cloud. Do not scan pages you do not
            want Google to process.
          </Text>
        </View>

        {__DEV__ ? (
          <Button
            label="Open OCR lab (dev only)"
            variant="ghost"
            onPress={() => router.push('/ocr-lab')}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  alert: { backgroundColor: colors.dangerSurface, borderRadius: radii.md, padding: spacing.md },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  infoText: { flex: 1 },
});
