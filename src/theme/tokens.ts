/**
 * Inked design tokens.
 *
 * Values are derived from the approved screen designs (near-black surfaces,
 * white primary action, muted green for confidence). Every text/background
 * pair used by the UI primitives is covered by a contrast test
 * (see src/theme/tokens.test.ts), so changing a value here is safe to verify.
 */

export const colors = {
  background: '#0E0E10',
  surface: '#1B1B1D',
  surfaceRaised: '#232326',
  surfaceInput: '#2A2A2D',
  border: '#2F2F33',

  text: '#F5F5F7',
  textSecondary: '#A1A1A8',
  textMuted: '#92929A',

  primary: '#FFFFFF',
  onPrimary: '#0E0E10',

  success: '#5FD39A',
  successSurface: '#16342A',
  danger: '#FF8A8A',
  dangerSurface: '#3A1B1B',
  warning: '#F2C14E',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;

/** 4pt spacing scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Minimum interactive target (dp), per Android and iOS accessibility guidance. */
export const MIN_TOUCH_TARGET = 48;

export const sizes = {
  buttonHeight: 52,
  chipHeight: 36,
  iconSm: 18,
  iconMd: 24,
  iconLg: 32,
} as const;

export type TextVariant =
  'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'bodySmall' | 'caption' | 'overline';

type TypeStyle = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

export const typography: Record<TextVariant, TypeStyle> = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
};

/** Cap for OS font scaling on fixed-height UI (buttons, chips, tab labels). */
export const MAX_FONT_SCALE_UI = 1.4;
/** Looser cap for body copy so large-text users are still served. */
export const MAX_FONT_SCALE_BODY = 2;
