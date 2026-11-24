import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/layout/BackHeader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { countWords } from '@/features/ocr/confidence';
import { cloudFailureMessage } from '@/features/ocr/cloudOcrService';
import { ProfileButton } from '@/features/profile/ProfileButton';
import { colors, MAX_FONT_SCALE_BODY, MIN_TOUCH_TARGET, radii, spacing, typography } from '@/theme';

import { draftConfidence, isDraftBusy } from './draftReducer';
import { useFilingDraft } from './FilingDraftProvider';
import { PageOverlay } from './PageOverlay';
import { fixLigatures, trimSpaces } from './textTools';
import { useTranscriptionDraft } from './useTranscriptionDraft';

type View_ = 'text' | 'overlay';

const VIEW_OPTIONS = [
  { value: 'text', label: 'Editable Text' },
  { value: 'overlay', label: 'Image Overlay' },
] as const;

/** Proofread the text of one captured page, then continue to filing. */
export function TranscriptionEditorScreen({ imageUri }: { imageUri: string }) {
  const router = useRouter();
  const { setDraft } = useFilingDraft();
  const { state, edit, applyCloudText, retryCloud } = useTranscriptionDraft(imageUri);
  const [view, setView] = useState<View_>('text');
  const [memo, setMemo] = useState('');

  const recognition = state.onDevice.status === 'done' ? state.onDevice.recognition : null;
  const busy = isDraftBusy(state);
  const hasText = state.text.trim() !== '';
  const confidence = draftConfidence(state);

  const headline = hasText
    ? busy
      ? 'Transcription draft'
      : 'Transcription ready'
    : busy
      ? 'Reading your page…'
      : 'No text found';

  const engineLabel =
    state.baseEngine === 'cloud'
      ? 'Cloud · Google Gemini'
      : state.baseEngine === 'on_device'
        ? 'On-device'
        : null;

  const badge =
    state.baseEngine === 'cloud'
      ? 'CLOUD TEXT'
      : state.baseEngine === 'on_device'
        ? confidence === null
          ? 'ON-DEVICE'
          : `${(confidence * 100).toFixed(1)}% CONF`
        : busy
          ? 'READING…'
          : null;

  const lineCount = state.text.split('\n').filter((line) => line.trim() !== '').length;

  function leave() {
    if (!state.edited) {
      router.back();
      return;
    }
    Alert.alert('Discard this page?', 'Your edits will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  function confirm() {
    setDraft({
      imageUri,
      text: state.text.trim(),
      memo: memo.trim(),
      engine: state.baseEngine ?? 'on_device',
      confidence,
      imageWidth: recognition?.imageWidth ?? null,
      imageHeight: recognition?.imageHeight ?? null,
    });
    router.push('/filing');
  }

  return (
    <SafeAreaView style={styles.root}>
      <BackHeader
        title="Transcription Editor"
        subtitle="Page capture"
        onBack={leave}
        right={<ProfileButton />}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.preview}>
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel="Captured page"
            />
            {recognition && recognition.imageWidth > 0 ? (
              <View style={[styles.badge, styles.badgeLeft]}>
                <Text variant="caption">{`${recognition.imageWidth}x${recognition.imageHeight}`}</Text>
              </View>
            ) : null}
            {badge ? (
              <View style={[styles.badge, styles.badgeRight]}>
                <Text variant="caption">{badge}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={styles.flex}>
                <Text variant="overline" color="textSecondary">
                  Automated parsing
                </Text>
                <Text variant="title" accessibilityRole="header">
                  {headline}
                </Text>
              </View>
              {engineLabel ? (
                <View style={styles.chip}>
                  <Icon name="check-circle-outline" size={16} color="textSecondary" />
                  <Text variant="caption" color="textSecondary">
                    {engineLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <SegmentedControl
              accessibilityLabel="Editor view"
              options={VIEW_OPTIONS}
              value={view}
              onChange={setView}
            />

            {state.cloud.status === 'running' && state.onDevice.status !== 'running' ? (
              <View style={styles.banner}>
                <ActivityIndicator color={colors.textSecondary} />
                <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
                  Improving the text with cloud reading…
                </Text>
              </View>
            ) : null}

            {state.cloud.status === 'failed' ? (
              <View accessible accessibilityRole="alert" style={styles.banner}>
                <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
                  {cloudFailureMessage(state.cloud.code)}
                  {hasText ? ' Showing the on-device text.' : ''}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry cloud reading"
                  onPress={retryCloud}
                  style={styles.inlineAction}>
                  <Text variant="bodyStrong">Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {state.cloudOffered ? (
              <View style={styles.banner}>
                <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
                  Cloud text is ready. Using it replaces your edits.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use cloud text"
                  onPress={applyCloudText}
                  style={styles.inlineAction}>
                  <Text variant="bodyStrong">Use cloud text</Text>
                </Pressable>
              </View>
            ) : null}

            {view === 'text' ? (
              <View style={styles.buffer}>
                <View style={styles.bufferHeader}>
                  <Text variant="overline" color="textSecondary">
                    Transcription buffer
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {`${countWords(state.text)} words • ${lineCount} lines`}
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel="Transcription text"
                  multiline
                  value={state.text}
                  onChangeText={edit}
                  placeholder={busy ? 'Reading your page…' : 'Type or paste the text here'}
                  placeholderTextColor={colors.textMuted}
                  textAlignVertical="top"
                  maxFontSizeMultiplier={MAX_FONT_SCALE_BODY}
                  style={styles.textInput}
                />
                <View style={styles.bufferFooter}>
                  <Text variant="caption" color="textSecondary">
                    {state.edited ? 'Edited' : 'Ready for input'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear text"
                    disabled={!hasText}
                    onPress={() => edit('')}
                    style={styles.clear}>
                    <Text variant="overline" color={hasText ? 'textSecondary' : 'textMuted'}>
                      Clear
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <PageOverlay imageUri={imageUri} recognition={recognition} />
            )}

            <View style={styles.chips}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fix ligatures"
                onPress={() => edit(fixLigatures(state.text))}
                style={styles.toolChip}>
                <Text variant="bodySmall">Fix Ligatures</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Trim spaces"
                onPress={() => edit(trimSpaces(state.text))}
                style={styles.toolChip}>
                <Text variant="bodySmall">Trim Spaces</Text>
              </Pressable>
            </View>

            <View style={styles.memoRow}>
              <Icon name="label-outline" size={20} color="textSecondary" />
              <TextInput
                accessibilityLabel="Index tag or metadata notes"
                value={memo}
                onChangeText={setMemo}
                placeholder="Add index tag or metadata notes..."
                placeholderTextColor={colors.textMuted}
                maxLength={200}
                maxFontSizeMultiplier={MAX_FONT_SCALE_BODY}
                style={styles.memoInput}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              label="Discard / Retake"
              variant="secondary"
              leadingIcon="refresh"
              onPress={leave}
            />
            <Button
              label="Confirm & assign category"
              trailingIcon="arrow-forward"
              disabled={!hasText}
              accessibilityHint={hasText ? undefined : 'Enter or recognize some text first'}
              onPress={confirm}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  preview: {
    height: 180,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceInput,
  },
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    backgroundColor: colors.overlay,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeLeft: { left: spacing.sm },
  badgeRight: { right: spacing.sm },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  inlineAction: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  buffer: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  bufferHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textInput: {
    ...typography.body,
    color: colors.text,
    minHeight: 160,
    padding: 0,
  },
  bufferFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clear: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingLeft: spacing.lg },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  toolChip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceInput,
  },
  memoInput: { ...typography.bodySmall, flex: 1, color: colors.text, paddingVertical: spacing.md },
  actions: { gap: spacing.md },
});
