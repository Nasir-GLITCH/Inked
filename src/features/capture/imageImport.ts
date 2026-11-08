import * as ImagePicker from 'expo-image-picker';

import { MAX_SCAN_PAGES, type ScanResult } from './documentScanner';

/**
 * Lets the user pick existing photos from the gallery (Android's system photo picker,
 * which needs no storage permission). Returns the same shape as the scanner so callers
 * can treat both sources alike. Never throws.
 */
export async function pickImages(maxImages: number = MAX_SCAN_PAGES): Promise<ScanResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxImages,
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };
    return { status: 'success', imageUris: result.assets.map((asset) => asset.uri) };
  } catch {
    return { status: 'error', code: 'failed' };
  }
}
