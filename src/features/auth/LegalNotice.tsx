import * as WebBrowser from 'expo-web-browser';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text';
import { getLegalLinks } from '@/config/env';
import { colors } from '@/theme';

function openLink(url: string) {
  WebBrowser.openBrowserAsync(url).catch((error: unknown) => {
    // Opening the in-app browser can fail (no browser available); never crash the form.
    console.warn('legal: could not open link', error instanceof Error ? error.name : typeof error);
  });
}

type LinkProps = { label: string; url?: string };

function LegalLink({ label, url }: LinkProps) {
  if (!url) return <Text style={styles.strong}>{label}</Text>;
  return (
    <Text
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => openLink(url)}
      style={[styles.strong, styles.link]}>
      {label}
    </Text>
  );
}

/**
 * "By continuing, you accept the Privacy Policy and Terms." Links open only when the
 * URLs are configured; otherwise the text is shown without a link that goes nowhere.
 */
export function LegalNotice() {
  const { privacyPolicyUrl, termsUrl } = getLegalLinks();

  return (
    <Text variant="caption" color="textMuted" style={styles.centered}>
      By continuing, you accept the <LegalLink label="Privacy Policy" url={privacyPolicyUrl} /> and{' '}
      <LegalLink label="Terms of Use" url={termsUrl} />.
    </Text>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: 'center' },
  strong: { color: colors.text, fontWeight: '600' },
  link: { textDecorationLine: 'underline' },
});
