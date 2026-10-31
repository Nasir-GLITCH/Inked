import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ConfigError, getEnv } from '@/config/env';
import { ConfigErrorScreen } from '@/config/ConfigErrorScreen';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';

// Keep the splash screen up until we know whether a stored session exists.
SplashScreen.preventAutoHideAsync();

/** Inked is dark-only for now; navigation colours must match to avoid white flashes between screens. */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

/** Returns a message when required configuration is missing, otherwise undefined. */
function checkConfig(): string | undefined {
  try {
    getEnv();
    return undefined;
  } catch (error) {
    if (error instanceof ConfigError) return error.message;
    throw error;
  }
}

function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hide();
  }, [status]);

  if (status === 'loading') return null;

  // Guards re-route automatically when the session starts or ends (sign-in, sign-out,
  // expired or revoked session). Server-side RLS still enforces access to data.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)/sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const configProblem = checkConfig();

  useEffect(() => {
    if (configProblem) SplashScreen.hide();
  }, [configProblem]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      {configProblem ? (
        <ConfigErrorScreen message={configProblem} />
      ) : (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      )}
    </ThemeProvider>
  );
}
