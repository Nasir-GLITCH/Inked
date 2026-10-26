import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

export type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned header slot, e.g. search and profile buttons. */
  headerRight?: ReactNode;
  children: ReactNode;
};

/** Standard tab screen: safe-area aware, themed background, title block. */
export function Screen({ title, subtitle, headerRight, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text variant="display" accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {headerRight}
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  titles: { flex: 1, gap: spacing.xs },
  content: { flex: 1 },
});
