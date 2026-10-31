import Constants from 'expo-constants';
import { useRef, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { LegalNotice } from '@/features/auth/LegalNotice';
import { PasswordStrengthMeter } from '@/features/auth/PasswordStrengthMeter';
import { useAuthForm, type AuthMode } from '@/features/auth/useAuthForm';
import { colors, radii, sizes, spacing } from '@/theme';

const MODE_OPTIONS = [
  { value: 'signIn', label: 'Sign In' },
  { value: 'signUp', label: 'Create Account' },
] as const;

const COPY: Record<AuthMode, { title: string; subtitle: string }> = {
  signIn: {
    title: 'Welcome back',
    subtitle: 'Access your digitized notes, marginalia, and archival neural synthesis.',
  },
  signUp: {
    title: 'Initialize Workspace',
    subtitle:
      'Store handwritten journals, extract instant OCR, and build your digital knowledge archive.',
  },
};

function Banner({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  const isError = tone === 'error';
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        { backgroundColor: isError ? colors.dangerSurface : colors.successSurface },
      ]}>
      <Icon
        name={isError ? 'error-outline' : 'check-circle'}
        size={sizes.iconSm}
        color={isError ? 'danger' : 'success'}
      />
      <Text variant="bodySmall" color={isError ? 'danger' : 'success'} style={styles.bannerText}>
        {message}
      </Text>
    </View>
  );
}

/** Sign In and Create Account share one screen; the segmented control switches between them. */
export function AuthScreen() {
  const form = useAuthForm('signIn');
  const { mode, values, fieldErrors, submitting } = form;
  const isSignUp = mode === 'signUp';

  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const fields = (
    <View style={styles.fields}>
      {isSignUp ? (
        <Input
          label="Scholar alias / full name"
          icon="badge"
          value={values.name}
          onChangeText={(text) => form.setValue('name', text)}
          error={fieldErrors.name}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          maxLength={80}
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
        />
      ) : null}
      <Input
        ref={emailRef}
        label={isSignUp ? 'Archival email address' : 'Archival identity / email'}
        labelStyle={isSignUp ? 'regular' : 'overline'}
        icon="alternate-email"
        value={values.email}
        onChangeText={(text) => form.setValue('email', text)}
        error={fieldErrors.email}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <View style={styles.passwordGroup}>
        <Input
          ref={passwordRef}
          label={isSignUp ? 'Password' : 'Security key'}
          labelStyle={isSignUp ? 'regular' : 'overline'}
          icon="lock-outline"
          value={values.password}
          onChangeText={(text) => form.setValue('password', text)}
          error={fieldErrors.password}
          passwordToggle={isSignUp ? 'icon' : 'text'}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          textContentType={isSignUp ? 'newPassword' : 'password'}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={form.submit}
        />
        {isSignUp ? <PasswordStrengthMeter password={values.password} /> : null}
      </View>
    </View>
  );

  const submitButton = (
    <Button
      label={isSignUp ? 'Create Workspace & Get Started' : 'Open Vault'}
      trailingIcon="arrow-forward"
      onPress={form.submit}
      loading={submitting}
    />
  );

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Icon name="edit-note" size={sizes.iconLg} />
            </View>
            <Text variant="display" accessibilityRole="header" style={styles.centered}>
              {COPY[mode].title}
            </Text>
            <Text variant="body" color="textSecondary" style={styles.centered}>
              {COPY[mode].subtitle}
            </Text>
          </View>

          <SegmentedControl
            accessibilityLabel="Sign in or create an account"
            options={MODE_OPTIONS}
            value={mode}
            onChange={form.setMode}
          />

          {form.notice ? <Banner tone="success" message={form.notice} /> : null}
          {form.formError ? <Banner tone="error" message={form.formError} /> : null}

          {isSignUp ? (
            <View style={styles.formStack}>
              {fields}
              {submitButton}
            </View>
          ) : (
            <View style={styles.card}>
              {fields}
              {submitButton}
            </View>
          )}

          {isSignUp ? (
            <View style={styles.switchRow}>
              <Text variant="bodySmall" color="textSecondary">
                Already have an archival key?
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                onPress={() => form.setMode('signIn')}
                style={styles.switchLink}>
                <Text variant="bodySmall" style={styles.switchLinkText}>
                  Sign In
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.footer}>
            <LegalNotice />
            <Text variant="caption" color="textMuted">
              Inked v{Constants.expoConfig?.version ?? ''}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  centered: { textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.xl,
  },
  formStack: { gap: spacing.xl },
  fields: { gap: spacing.lg },
  passwordGroup: { gap: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  bannerText: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  switchLink: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  switchLinkText: { fontWeight: '600', textDecorationLine: 'underline' },
  footer: { alignItems: 'center', gap: spacing.sm, marginTop: 'auto', paddingTop: spacing.lg },
});
