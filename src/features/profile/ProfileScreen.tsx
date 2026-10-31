import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { deleteAccount, signOut } from '@/features/auth/authService';
import { getInitials } from '@/features/profile/initials';
import { useProfile } from '@/features/profile/useProfile';
import { colors, MIN_TOUCH_TARGET, radii, spacing } from '@/theme';

const AVATAR_SIZE = 88;

export function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { state, retry } = useProfile();
  const [busy, setBusy] = useState<'signOut' | 'delete' | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const inFlight = useRef(false);

  const email = user?.email ?? null;
  const profile = state.status === 'ready' ? state.profile : undefined;
  const displayName = profile?.displayName ?? null;

  /** One account action at a time; success changes auth state and the route guard leaves this screen. */
  async function runAccountAction(kind: 'signOut' | 'delete', action: typeof signOut) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(kind);
    setErrorMessage(undefined);
    try {
      const result = await action();
      if (!result.ok) setErrorMessage(result.failure.message);
    } finally {
      inFlight.current = false;
      setBusy(undefined);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and everything in it. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            runAccountAction('delete', deleteAccount);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}>
          <Icon name="arrow-back" />
        </Pressable>
        <Text variant="heading" accessibilityRole="header">
          Profile
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identityCard}>
          <View style={styles.avatar} accessible accessibilityLabel="Profile picture placeholder">
            <Text variant="title">{getInitials(displayName, email)}</Text>
          </View>

          {state.status === 'loading' ? (
            <ActivityIndicator color={colors.textSecondary} accessibilityLabel="Loading profile" />
          ) : null}

          {displayName ? (
            <Text variant="title" style={styles.centered} numberOfLines={2}>
              {displayName}
            </Text>
          ) : null}
          {email ? (
            <Text
              variant="bodySmall"
              color="textSecondary"
              style={styles.centered}
              numberOfLines={1}>
              {email}
            </Text>
          ) : null}
          {profile ? (
            <View style={styles.planChip}>
              <Text variant="caption">{profile.plan === 'pro' ? 'Pro plan' : 'Free plan'}</Text>
            </View>
          ) : null}

          {state.status === 'error' ? (
            <View style={styles.inlineError}>
              <Text variant="bodySmall" color="textSecondary" style={styles.centered}>
                Could not load your profile details.
              </Text>
              <Button label="Try again" variant="secondary" onPress={retry} />
            </View>
          ) : null}
        </View>

        {errorMessage ? (
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.errorBanner}>
            <Text variant="bodySmall" color="danger">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Sign out"
            variant="destructive"
            leadingIcon="logout"
            loading={busy === 'signOut'}
            disabled={busy === 'delete'}
            onPress={() => runAccountAction('signOut', signOut)}
          />
          <Button
            label="Delete account"
            variant="ghost"
            loading={busy === 'delete'}
            disabled={busy === 'signOut'}
            accessibilityHint="Permanently deletes your account"
            onPress={confirmDelete}
          />
        </View>

        <Text variant="caption" color="textMuted" style={styles.centered}>
          Inked v{Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.xl },
  identityCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.surfaceInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { textAlign: 'center' },
  planChip: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  inlineError: { alignSelf: 'stretch', gap: spacing.md },
  errorBanner: {
    backgroundColor: colors.dangerSurface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  actions: { gap: spacing.sm },
});
