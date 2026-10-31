import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, MIN_TOUCH_TARGET } from '@/theme';

/** White circular person button shown at the top right of every tab, as in the designs. */
export function ProfileButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      onPress={() => router.push('/profile')}
      style={styles.button}>
      <Icon name="person-outline" color="onPrimary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
