import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radii, sizes, spacing, type ColorToken } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  /** Shows a spinner and ignores presses, which prevents duplicate submissions. */
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const VARIANTS: Record<ButtonVariant, { background: string; text: ColorToken; border?: string }> = {
  primary: { background: colors.primary, text: 'onPrimary' },
  secondary: { background: colors.surfaceRaised, text: 'text', border: colors.border },
  destructive: { background: colors.surfaceRaised, text: 'danger', border: colors.border },
  ghost: { background: 'transparent', text: 'textSecondary' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  const palette = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border ?? 'transparent',
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors[palette.text]} />
      ) : (
        <View style={styles.content}>
          {leadingIcon ? (
            <Icon name={leadingIcon} size={sizes.iconSm} color={palette.text} />
          ) : null}
          <Text variant="bodyStrong" color={palette.text} numberOfLines={1} style={styles.label}>
            {label}
          </Text>
          {trailingIcon ? (
            <Icon name={trailingIcon} size={sizes.iconSm} color={palette.text} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.buttonHeight,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { flexShrink: 1 },
});
