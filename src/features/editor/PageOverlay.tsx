import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/components/ui/Text';
import { isLowConfidence } from '@/features/ocr/confidence';
import type { Recognition } from '@/features/ocr/recognitionSchema';
import { colors, radii, spacing } from '@/theme';

import { scaleFrame } from './overlayGeometry';

/**
 * The page image with a box around every line the on-device engine found. Lines it is not
 * sure about get a thicker dashed amber box and are counted in the caption, so the warning
 * does not rely on colour alone.
 */
export function PageOverlay({
  imageUri,
  recognition,
}: {
  imageUri: string;
  recognition: Recognition | null;
}) {
  const [displayWidth, setDisplayWidth] = useState(0);

  const lines = recognition?.blocks.flatMap((block) => block.lines) ?? [];
  const uncertain = lines.filter(isLowConfidence).length;
  const aspectRatio =
    recognition && recognition.imageWidth > 0 && recognition.imageHeight > 0
      ? recognition.imageWidth / recognition.imageHeight
      : 3 / 4;

  function onLayout(event: LayoutChangeEvent) {
    setDisplayWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.wrapper}>
      <View
        onLayout={onLayout}
        accessible
        accessibilityLabel="Page image with the detected text lines outlined"
        style={[styles.frame, { aspectRatio }]}>
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        {recognition
          ? lines.map((line, index) => {
              const box = scaleFrame(line.frame, recognition.imageWidth, displayWidth);
              if (!box) return null;
              const low = isLowConfidence(line);
              return (
                <View
                  key={index}
                  pointerEvents="none"
                  style={[styles.box, low ? styles.boxLow : styles.boxOk, box]}
                />
              );
            })
          : null}
      </View>
      <Text variant="bodySmall" color="textSecondary">
        {recognition
          ? uncertain === 0
            ? `${lines.length} lines found. All look clear.`
            : `${lines.length} lines found. ${uncertain} outlined with a dashed amber box may need checking.`
          : 'Line outlines need the on-device reading, which is not available for this page.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  frame: {
    width: '100%',
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceInput,
  },
  box: { position: 'absolute', borderRadius: 2 },
  boxOk: { borderWidth: 1, borderColor: colors.success },
  boxLow: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.warning },
});
