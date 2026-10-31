import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { sizes, spacing } from '@/theme';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <Icon name={icon} size={sizes.iconLg * 1.5} color="textMuted" />
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
