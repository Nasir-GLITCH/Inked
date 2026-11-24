import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { MIN_TOUCH_TARGET, radii, spacing } from '@/theme';

export type BackHeaderProps = {
  title: string;
  /** Small caption under the title, shown in capitals. */
  subtitle?: string;
  /** Runs instead of going back, for example to confirm before leaving. */
  onBack?: () => void;
  right?: ReactNode;
};

/** Header for screens pushed on top of the tabs: back button, title block, optional right slot. */
export function BackHeader({ title, subtitle, onBack, right }: BackHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack ?? (() => router.back())}
        style={styles.backButton}>
        <Icon name="arrow-back" />
      </Pressable>
      <View style={styles.titles}>
        <Text variant="heading" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="overline" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, gap: spacing.xxs },
});
