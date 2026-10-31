import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

import { colors, sizes, type ColorToken } from '@/theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorToken;
};

/**
 * Decorative icon, hidden from screen readers. Controls that rely on an icon must
 * carry their own accessibilityLabel on the pressable that wraps it.
 */
export function Icon({ name, size = sizes.iconMd, color = 'text' }: IconProps) {
  return (
    <MaterialIcons
      name={name}
      size={size}
      color={colors[color]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
