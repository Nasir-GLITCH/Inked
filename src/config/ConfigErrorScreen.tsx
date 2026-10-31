import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

/**
 * Shown instead of the app when required configuration is missing or invalid, so a
 * misconfigured build explains itself instead of crashing. Shows no configuration values.
 */
export function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Icon name="settings-suggest" size={48} color="textSecondary" />
      <Text variant="heading" style={styles.centered}>
        Inked is not set up correctly
      </Text>
      <Text variant="bodySmall" color="textSecondary" style={styles.centered}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  centered: { textAlign: 'center' },
});
