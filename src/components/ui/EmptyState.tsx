import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { colors, sizes, spacing } from '@/theme';

export type EmptyStateProps = {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <MaterialIcons
        name={icon}
        size={sizes.iconLg * 1.5}
        color={colors.textMuted}
        accessible={false}
        importantForAccessibility="no"
      />
      <Text variant="heading" style={styles.centered}>
        {title}
      </Text>
      <Text variant="bodySmall" color="textSecondary" style={styles.centered}>
        {message}
      </Text>
      {action ? (
        <Button label={action.label} onPress={action.onPress} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  centered: { textAlign: 'center' },
  action: { marginTop: spacing.md, alignSelf: 'stretch' },
});
