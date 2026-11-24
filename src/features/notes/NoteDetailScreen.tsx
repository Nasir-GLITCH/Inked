import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/layout/BackHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useDatabase } from '@/db/DatabaseProvider';
import type { Note } from '@/db/noteRepository';
import { removePageImage } from '@/features/capture/pageImageStorage';
import { colors, radii, spacing } from '@/theme';

import { formatNoteDate, noteBadge } from './format';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; note: Note }
  | { status: 'missing' }
  | { status: 'error' };

/** Read one saved note: page image, text, tags. Lets the user delete it. */
export function NoteDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const database = useDatabase();
  const [loaded, setLoaded] = useState<LoadState>({ status: 'loading' });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    if (database.status !== 'ready') return;
    let active = true;
    database.repositories.notes
      .get(id)
      .then((note) => {
        if (active) setLoaded(note ? { status: 'ready', note } : { status: 'missing' });
      })
      .catch(() => {
        if (active) setLoaded({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [database, id]);

  const state: LoadState = database.status === 'error' ? { status: 'error' } : loaded;

  async function remove(note: Note) {
    if (database.status !== 'ready' || deleting) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await database.repositories.notes.remove(note.id);
    } catch {
      setDeleting(false);
      setDeleteError(true);
      return;
    }
    // The note is gone; a leftover image file is only wasted space, so ignore a failure here.
    if (note.imageUri) removePageImage(note.imageUri);
    router.back();
  }

  function confirmDelete(note: Note) {
    Alert.alert('Delete this note?', 'The text and page image will be removed from this phone.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(note) },
    ]);
  }

  if (state.status === 'missing' || state.status === 'error') {
    return (
      <EmptyState
        icon="error-outline"
        title={state.status === 'missing' ? 'Note not found' : 'Note could not be opened'}
        message={
          state.status === 'missing'
            ? 'It may have been deleted.'
            : 'Something went wrong while opening this note.'
        }
        action={{ label: 'Go back', onPress: () => router.back() }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <BackHeader title="Note" subtitle={state.status === 'ready' ? state.note.categoryName : ''} />
      {state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textSecondary} accessibilityLabel="Loading note" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {state.note.imageUri ? (
            <Image
              source={{ uri: state.note.imageUri }}
              style={styles.image}
              contentFit="cover"
              accessibilityLabel="Scanned page"
            />
          ) : null}
          <View style={styles.metaRow}>
            <Text variant="caption" color="textSecondary">
              {`${formatNoteDate(state.note.createdAt)} • ${state.note.wordCount} words`}
            </Text>
            <View style={styles.pill}>
              <Text variant="caption">{noteBadge(state.note)}</Text>
            </View>
          </View>
          <Text variant="title" accessibilityRole="header">
            {state.note.title}
          </Text>
          <Text variant="body" selectable>
            {state.note.body}
          </Text>
          {state.note.tags.length > 0 ? (
            <Text variant="bodySmall" color="textSecondary">
              {state.note.tags.map((tag) => `#${tag}`).join('  ')}
            </Text>
          ) : null}
          {state.note.memo ? (
            <View style={styles.memo}>
              <Text variant="overline" color="textSecondary">
                Index notes
              </Text>
              <Text variant="bodySmall">{state.note.memo}</Text>
            </View>
          ) : null}
          {deleteError ? (
            <Text variant="bodySmall" color="danger" accessibilityRole="alert">
              The note could not be deleted. Please try again.
            </Text>
          ) : null}
          <Button
            label="Delete note"
            variant="destructive"
            leadingIcon="delete-outline"
            loading={deleting}
            onPress={() => confirmDelete(state.note)}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  image: { height: 200, borderRadius: radii.lg, backgroundColor: colors.surfaceInput },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  memo: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
});
