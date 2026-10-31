import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { getPasswordStrength, type StrengthLevel } from '@/features/auth/passwordStrength';
import { colors, radii, sizes, spacing } from '@/theme';

const BAR_COUNT = 3;

const FILL_BY_LEVEL: Record<StrengthLevel, string> = {
  0: colors.danger,
  1: colors.warning,
  2: colors.text,
  3: colors.success,
};

/**
 * Three-bar password strength indicator with a text explanation. The text carries the
 * meaning, so the bar colour is never the only signal.
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (password.length === 0) return null;

  const { level, label } = getPasswordStrength(password);
  const filledBars = Math.max(level, 1);

  return (
    <View style={styles.container} accessible accessibilityLabel={`Password strength. ${label}`}>
      <View style={styles.bars}>
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              { backgroundColor: index < filledBars ? FILL_BY_LEVEL[level] : colors.surfaceInput },
            ]}
          />
        ))}
      </View>
      <View style={styles.labelRow}>
        <Icon
          name={level === 3 ? 'check-circle' : 'info-outline'}
          size={sizes.iconSm}
          color={level === 3 ? 'success' : 'textSecondary'}
        />
        <Text variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  bars: { flexDirection: 'row', gap: spacing.sm },
  bar: { flex: 1, height: 4, borderRadius: radii.pill },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1 },
});
