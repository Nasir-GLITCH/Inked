import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/layout/BackHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { CategoryError, MAX_CATEGORY_NAME_LENGTH, type Category } from '@/db/categoryRepository';
import { useDatabase } from '@/db/DatabaseProvider';
import { MAX_TAGS_PER_NOTE, normalizeTag, normalizeTags } from '@/db/tags';
import { useFilingDraft } from '@/features/editor/FilingDraftProvider';
import { countWords } from '@/features/ocr/confidence';
import { colors, MAX_FONT_SCALE_BODY, MIN_TOUCH_TARGET, radii, spacing } from '@/theme';

import { saveFailureMessage, saveNote } from './saveNote';
import { useCategories } from './useCategories';

/** Second step of capture: choose a category, add tags, then save the note on this phone. */
export function FilingScreen() {
  const router = useRouter();
  const database = useDatabase();
  const { draft, setDraft } = useFilingDraft();
  const { state, reload } = useCategories();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!draft) {
    return (
      <EmptyState
        icon="error-outline"
        title="Nothing to file"
        message="Capture a page and confirm its text first."
        action={{ label: 'Go back', onPress: () => router.back() }}
      />
    );
  }

  const badge =
    draft.engine === 'cloud'
      ? 'CLOUD TEXT'
      : draft.confidence === null
        ? 'ON-DEVICE'
        : `${(draft.confidence * 100).toFixed(1)}% CONF`;
  const categories: Category[] = state.status === 'ready' ? state.categories : [];
  const canSave = selectedId !== null && database.status === 'ready' && !saving;

  async function createCategory() {
    if (database.status !== 'ready') return;
    try {
      const created = await database.repositories.categories.create({ name: newName });
      reload();
      setSelectedId(created.id);
      setNewName('');
      setCreating(false);
      setCategoryError(null);
    } catch (error) {
      if (error instanceof CategoryError) {
        setCategoryError(
          error.code === 'duplicate_name'
            ? 'You already have a category with that name.'
            : 'Enter a name for the category.',
        );
      } else {
        setCategoryError('The category could not be created. Please try again.');
      }
    }
  }

  function addTag() {
    const tag = normalizeTag(tagInput);
    setTagInput('');
    if (!tag) return;
    setTags(normalizeTags([...tags, tag]));
  }

  async function save() {
    if (!draft || database.status !== 'ready' || !selectedId || saving) return;
    setSaving(true);
    setSaveError(null);
    const result = await saveNote(database.repositories, draft, {
      categoryId: selectedId,
      tags,
      pinned,
    });
    if (!result.ok) {
      setSaving(false);
      setSaveError(saveFailureMessage(result.failure));
      if (result.failure === 'unknown_category') {
        setSelectedId(null);
        reload();
      }
      return;
    }
    setDraft(null);
    router.dismissTo('/');
  }

  function leave() {
    router.back();
  }

  function discard() {
    Alert.alert('Discard this page?', 'The page will not be saved.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setDraft(null);
          router.dismissTo('/');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <BackHeader title="Filing & Taxonomy" subtitle="Step 2 of 2" onBack={leave} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.card}>
            <View style={styles.metaRow}>
              <Text variant="caption" color="textSecondary">
                {`${countWords(draft.text)} words • ${draft.text.length} characters`}
              </Text>
              <View style={styles.pill}>
                <Text variant="caption">{badge}</Text>
              </View>
            </View>
            <Text variant="bodySmall" numberOfLines={4}>
              {draft.text}
            </Text>
          </View>

          <View style={styles.section}>
            <Text variant="overline" color="textSecondary" accessibilityRole="header">
              Assign category
            </Text>
            {state.status === 'loading' ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : state.status === 'error' ? (
              <View accessible accessibilityRole="alert" style={styles.banner}>
                <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
                  Your categories could not be loaded.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading categories"
                  onPress={reload}
                  style={styles.inlineAction}>
                  <Text variant="bodyStrong">Retry</Text>
                </Pressable>
              </View>
            ) : (
              <View accessibilityRole="radiogroup" style={styles.list}>
                {categories.length === 0 && !creating ? (
                  <Text variant="bodySmall" color="textSecondary">
                    You have no categories yet. Create your first one.
                  </Text>
                ) : null}
                {categories.map((category) => {
                  const selected = category.id === selectedId;
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${category.name}, ${category.noteCount} notes`}
                      onPress={() => setSelectedId(category.id)}
                      style={[styles.option, selected && styles.optionSelected]}>
                      <Icon
                        name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                        color={selected ? 'text' : 'textMuted'}
                      />
                      <Text variant="body" style={styles.flex} numberOfLines={1}>
                        {category.name}
                      </Text>
                      <Text variant="caption" color="textSecondary">
                        {category.noteCount}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {state.status === 'ready' ? (
              creating ? (
                <View style={styles.createBox}>
                  <TextInput
                    accessibilityLabel="New category name"
                    value={newName}
                    onChangeText={(value) => {
                      setNewName(value);
                      setCategoryError(null);
                    }}
                    placeholder="Category name"
                    placeholderTextColor={colors.textMuted}
                    maxLength={MAX_CATEGORY_NAME_LENGTH}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={createCategory}
                    maxFontSizeMultiplier={MAX_FONT_SCALE_BODY}
                    style={styles.input}
                  />
                  {categoryError ? (
                    <Text variant="caption" color="danger" accessibilityRole="alert">
                      {categoryError}
                    </Text>
                  ) : null}
                  <View style={styles.row}>
                    <Button
                      label="Cancel"
                      variant="secondary"
                      onPress={() => {
                        setCreating(false);
                        setNewName('');
                        setCategoryError(null);
                      }}
                      style={styles.flex}
                    />
                    <Button label="Create" onPress={createCategory} style={styles.flex} />
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create new category"
                  onPress={() => setCreating(true)}
                  style={styles.option}>
                  <Icon name="add" color="textSecondary" />
                  <Text variant="body" color="textSecondary">
                    Create new category
                  </Text>
                </Pressable>
              )
            ) : null}
          </View>

          <View style={styles.section}>
            <Text variant="overline" color="textSecondary" accessibilityRole="header">
              Labels & tags
            </Text>
            <View style={styles.chips}>
              {tags.map((tag) => (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove tag ${tag}`}
                  onPress={() => setTags(tags.filter((t) => t !== tag))}
                  style={styles.tagChip}>
                  <Text variant="bodySmall">{`#${tag}`}</Text>
                  <Icon name="close" size={16} color="textSecondary" />
                </Pressable>
              ))}
            </View>
            {tags.length < MAX_TAGS_PER_NOTE ? (
              <TextInput
                accessibilityLabel="Add a tag"
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                onBlur={addTag}
                placeholder="Add a tag and press done"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                returnKeyType="done"
                maxFontSizeMultiplier={MAX_FONT_SCALE_BODY}
                style={styles.input}
              />
            ) : (
              <Text variant="caption" color="textSecondary">
                {`Up to ${MAX_TAGS_PER_NOTE} tags per note.`}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text variant="overline" color="textSecondary" accessibilityRole="header">
              Filing preferences
            </Text>
            <View style={styles.prefRow}>
              <View style={styles.flex}>
                <Text variant="body">Pin to home</Text>
                <Text variant="caption" color="textSecondary">
                  Keep this note at the top of your list
                </Text>
              </View>
              <Switch
                accessibilityLabel="Pin to home"
                value={pinned}
                onValueChange={setPinned}
                trackColor={{ true: colors.success, false: colors.surfaceInput }}
              />
            </View>
          </View>

          {saveError ? (
            <Text variant="bodySmall" color="danger" accessibilityRole="alert">
              {saveError}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Save & Index Note"
              trailingIcon="check"
              loading={saving}
              disabled={!canSave}
              accessibilityHint={selectedId ? undefined : 'Choose a category first'}
              onPress={save}
            />
            <Button label="Discard page" variant="ghost" onPress={discard} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  section: { gap: spacing.md },
  list: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: { borderColor: colors.text, backgroundColor: colors.surfaceRaised },
  createBox: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceInput,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  inlineAction: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actions: { gap: spacing.md },
});
