import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import {
  colors,
  MAX_FONT_SCALE_BODY,
  MIN_TOUCH_TARGET,
  radii,
  sizes,
  spacing,
  typography,
} from '@/theme';

export type InputProps = Omit<
  TextInputProps,
  'style' | 'placeholderTextColor' | 'secureTextEntry' | 'accessibilityLabel'
> & {
  label: string;
  /** 'overline' = small uppercase caption, 'regular' = sentence-case caption. */
  labelStyle?: 'overline' | 'regular';
  icon: IconName;
  /** Validation message. Announced to screen readers and shown under the field. */
  error?: string;
  /** Makes this a password field with a show/hide control, as text or as an eye icon. */
  passwordToggle?: 'text' | 'icon';
  /** Optional element on the right of the label row, e.g. a "Forgot password?" link. */
  labelAccessory?: ReactNode;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export function Input({
  label,
  labelStyle = 'regular',
  icon,
  error,
  passwordToggle,
  labelAccessory,
  ref,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPassword = passwordToggle !== undefined;

  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text variant={labelStyle === 'overline' ? 'overline' : 'bodySmall'} color="textSecondary">
          {label}
        </Text>
        {labelAccessory}
      </View>

      <View style={[styles.field, focused && styles.focused, error ? styles.invalid : null]}>
        <Icon name={icon} color="textSecondary" />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.text}
          maxFontSizeMultiplier={MAX_FONT_SCALE_BODY}
          secureTextEntry={isPassword && !revealed}
          style={styles.input}
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((value) => !value)}
            style={styles.toggle}>
            {passwordToggle === 'icon' ? (
              <Icon name={revealed ? 'visibility-off' : 'visibility'} color="textSecondary" />
            ) : (
              <Text variant="bodySmall" color="textSecondary">
                {revealed ? 'Hide' : 'Show'}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text
          variant="caption"
          color="danger"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  field: {
    minHeight: sizes.buttonHeight + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceInput,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  focused: { borderColor: colors.textSecondary },
  invalid: { borderColor: colors.danger },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    paddingVertical: 0,
  },
  toggle: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
});
