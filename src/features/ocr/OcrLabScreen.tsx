import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

import { aggregateConfidence, countWords, formatConfidence, isLowConfidence } from './confidence';
import { formatLabReport } from './labReport';
import type { LabPage } from './labTypes';
import { ocrFailureMessage } from './ocrService';
import { useOcrLab } from './useOcrLab';

/**
 * Developer-only screen for judging OCR quality on real pages: scan, then see speed, word
 * count and confidence per page and per line. Not reachable in release builds.
 */
export function OcrLabScreen() {
  const router = useRouter();
  const { pages, busy, notice, scanAndRecognize, importAndRecognize } = useOcrLab();

  useEffect(() => {
    if (!__DEV__) router.replace('/');
  }, [router]);

  if (!__DEV__) return null;

  const finished =
    pages.length > 0 && pages.every((p) => p.status === 'done' || p.status === 'failed');

  return (
    <Screen title="OCR lab" subtitle="Developer tool: scan pages and check text recognition">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Button
          label={pages.length > 0 ? 'Scan again' : 'Scan pages'}
          leadingIcon="document-scanner"
          onPress={scanAndRecognize}
          loading={busy}
        />
        <Button
          label="Import from gallery"
          variant="secondary"
          leadingIcon="photo-library"
          onPress={importAndRecognize}
          loading={busy}
        />
        {notice ? (
          <View accessible accessibilityRole="alert" style={styles.notice}>
            <Text variant="bodySmall" color="danger">
              {notice}
            </Text>
          </View>
        ) : null}
        {finished ? (
          <Button
            label="Share results"
            variant="secondary"
            leadingIcon="share"
            onPress={() => Share.share({ message: formatLabReport(pages) })}
          />
        ) : null}
        {pages.map((page, index) => (
          <PageResult key={page.id} page={page} number={index + 1} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function PageResult({ page, number }: { page: LabPage; number: number }) {
  const { recognition } = page;
  const confidence = recognition ? aggregateConfidence(recognition) : null;
  const lines = recognition?.blocks.flatMap((block) => block.lines) ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image
          source={{ uri: page.uri }}
          style={styles.thumbnail}
          contentFit="cover"
          accessibilityLabel={`Scanned page ${number}`}
        />
        <View style={styles.cardTitles}>
          <Text variant="heading">Page {number}</Text>
          {page.status === 'queued' ? <Text color="textSecondary">Waiting</Text> : null}
          {page.status === 'running' ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.text} />
              <Text color="textSecondary">Reading text…</Text>
            </View>
          ) : null}
          {page.status === 'failed' ? (
            <Text color="danger">
              {ocrFailureMessage(page.failureCode ?? 'recognition_failed')}
            </Text>
          ) : null}
          {recognition ? (
            <>
              <Text variant="bodySmall" color="textSecondary">
                {`${recognition.durationMs} ms · ${countWords(recognition.text)} words`}
              </Text>
              <Text variant="bodySmall" color="textSecondary">
                {`Confidence ${formatConfidence(confidence)}`}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {recognition && lines.length === 0 ? (
        <Text color="textSecondary">No text was found on this page.</Text>
      ) : null}

      {lines.map((line, index) => {
        const low = isLowConfidence(line);
        return (
          <View key={index} style={styles.line}>
            <View style={styles.badge}>
              {low ? <Icon name="warning" size={14} color="warning" /> : null}
              <Text variant="caption" color={low ? 'warning' : 'textSecondary'}>
                {low
                  ? `Check ${formatConfidence(line.confidence)}`
                  : formatConfidence(line.confidence)}
              </Text>
            </View>
            <Text selectable style={styles.lineText}>
              {line.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  notice: { backgroundColor: colors.dangerSurface, borderRadius: radii.md, padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', gap: spacing.md },
  cardTitles: { flex: 1, gap: spacing.xs },
  thumbnail: {
    width: 72,
    height: 96,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceInput,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { gap: spacing.xxs },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  lineText: { color: colors.text },
});
