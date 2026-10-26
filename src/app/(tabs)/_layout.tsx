import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme';

/**
 * Primary navigation: Notes, Capture, Sticky, Library (matches the approved designs).
 * Android uses Material icon names (`md`); iOS uses SF Symbols (`sf`).
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.surfaceInput}
      iconColor={{ default: colors.textSecondary, selected: colors.text }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.text },
      }}
      labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="doc.text" md="description" />
        <NativeTabs.Trigger.Label>Notes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="capture">
        <NativeTabs.Trigger.Icon sf="doc.viewfinder" md="document_scanner" />
        <NativeTabs.Trigger.Label>Capture</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sticky">
        <NativeTabs.Trigger.Icon sf="note.text" md="sticky_note_2" />
        <NativeTabs.Trigger.Label>Sticky</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon sf="folder" md="folder" />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
