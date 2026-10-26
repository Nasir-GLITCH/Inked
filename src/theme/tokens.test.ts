import { contrastRatio } from '@/test/contrast';
import { colors, MIN_TOUCH_TARGET, sizes } from '@/theme';

const WCAG_AA_NORMAL_TEXT = 4.5;

describe('contrastRatio helper', () => {
  it('returns 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio(colors.text, colors.surface)).toBeCloseTo(
      contrastRatio(colors.surface, colors.text),
      10,
    );
  });

  it('rejects non-hex input instead of silently returning a wrong ratio', () => {
    expect(() => contrastRatio('rgba(0,0,0,0.5)', '#FFFFFF')).toThrow(/6-digit hex/);
  });
});

describe('colour tokens meet WCAG AA (4.5:1) for text', () => {
  const surfaces = ['background', 'surface', 'surfaceRaised', 'surfaceInput'] as const;
  const textColours = ['text', 'textSecondary', 'textMuted'] as const;

  it.each(surfaces.flatMap((surface) => textColours.map((text) => [text, surface] as const)))(
    '%s on %s',
    (text, surface) => {
      expect(contrastRatio(colors[text], colors[surface])).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    },
  );

  it('onPrimary on primary (button label)', () => {
    expect(contrastRatio(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
  });

  it('success text on its tinted surface', () => {
    expect(contrastRatio(colors.success, colors.successSurface)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
  });

  it('danger text on its tinted surface', () => {
    expect(contrastRatio(colors.danger, colors.dangerSurface)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
  });
});

describe('sizing tokens', () => {
  it('keeps the primary button at or above the minimum touch target', () => {
    expect(sizes.buttonHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
