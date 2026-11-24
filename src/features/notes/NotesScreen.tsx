import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { ProfileButton } from '@/features/profile/ProfileButton';
import { colors, MAX_FONT_SCALE_UI, MIN_TOUCH_TARGET, radii, spacing } from '@/theme';

import { NoteCard } from './NoteCard';
import { useNotes } from './useNotes';

/** The user's saved notes, newest first (pinned on top), filterable by category. */
export function NotesScreen() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { state, reload } = useNotes(categoryId);

  const total =
    state.status === 'ready' ? state.categories.reduce((sum, c) => sum + c.noteCount, 0) : 0;

  return (
    <Screen
      title="Notes"
      subtitle="Your scanned folios and transcriptions"
      headerRight={<ProfileButton />}>
      {state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textSecondary} accessibilityLabel="Loading notes" />
        </View>
      ) : state.status === 'error' ? (
        <EmptyState
          icon="error-outline"
          title="Notes could not be loaded"
          message="Something went wrong while opening your notes on this phone."
          action={{ label: 'Try again', onPress: reload }}
        />
      ) : total === 0 ? (
        <EmptyState
          icon="description"
          title="No notes yet"
          message="Scan a page to create your first note. It will appear here once it has been transcribed."
          action={{ label: 'Scan a page', onPress: () => router.navigate('/capture') }}
        />
      ) : (
        <>
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              accessibilityRole="tablist">
              <FilterChip
                label={`All (${total})`}
                selected={categoryId === null}
                onPress={() => setCategoryId(null)}
              />
              {state.categories
                .filter((category) => category.noteCount > 0)
                .map((category) => (
                  <FilterChip
                    key={category.id}
                    label={`${category.name} (${category.noteCount})`}
                    selected={categoryId === category.id}
                    onPress={() => setCategoryId(category.id)}
                  />
                ))}
            </ScrollView>
          </View>
          <FlatList
            data={state.notes}
            keyExtractor={(note) => note.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <NoteCard
                note={item}
                onPress={() => router.push({ pathname: '/note/[id]', params: { id: item.id } })}
              />
            )}
          />
        </>
      )}
    </Screen>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text
        variant="bodySmall"
        color={selected ? 'onPrimary' : 'text'}
        maxFontSizeMultiplier={MAX_FONT_SCALE_UI}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  list: { padding: spacing.lg, gap: spacing.md },
});
