import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import {
  colors,
  MAX_FONT_SCALE_BODY,
  MAX_FONT_SCALE_UI,
  typography,
  type ColorToken,
  type TextVariant,
} from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ColorToken;
};

const BODY_VARIANTS: ReadonlySet<TextVariant> = new Set(['body', 'bodyStrong', 'bodySmall']);

/** Themed text. All text in the app goes through this so type scale and scaling caps stay consistent. */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={BODY_VARIANTS.has(variant) ? MAX_FONT_SCALE_BODY : MAX_FONT_SCALE_UI}
      {...rest}
      style={[typography[variant], { color: colors[color] }, style]}
    />
  );
}
