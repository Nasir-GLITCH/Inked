import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { Note } from '@/db/noteRepository';
import { colors, radii, spacing } from '@/theme';

import { formatNoteDate, noteBadge, noteExcerpt } from './format';

/** One note in a list: category, tags, title, excerpt, date, length and text source. */
export function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  const excerpt = noteExcerpt(note);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${note.title}, ${note.categoryName}`}
      accessibilityHint="Opens the note"
      onPress={onPress}
      style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.pill}>
          <Text variant="overline">{note.categoryName}</Text>
        </View>
        {note.pinned ? <Icon name="push-pin" size={16} color="textSecondary" /> : null}
        <View style={styles.spacer} />
        <Text variant="caption" color="textSecondary">
          {noteBadge(note)}
        </Text>
      </View>
      {note.tags.length > 0 ? (
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {note.tags.map((tag) => `#${tag}`).join('  ')}
        </Text>
      ) : null}
      <Text variant="heading" numberOfLines={2}>
        {note.title}
      </Text>
      {excerpt ? (
        <Text variant="bodySmall" color="textSecondary" numberOfLines={3}>
          {excerpt}
        </Text>
      ) : null}
      <Text variant="caption" color="textMuted">
        {`${formatNoteDate(note.createdAt)} • ${note.wordCount} words`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spacer: { flex: 1 },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
