export type ScanFailureCode = 'unavailable' | 'failed';

export type ScanResult =
  | { status: 'success'; imageUris: string[] }
  | { status: 'cancelled' }
  | { status: 'error'; code: ScanFailureCode };

/** Pages one scan session may capture. Keeps memory and OCR time bounded. */
export const MAX_SCAN_PAGES = 5;

const SCAN_QUALITY = 90;

/**
 * Opens Google's document scanner (auto edge detection, crop and cleanup).
 * The plugin is loaded lazily because it does not exist in Expo Go or on builds made
 * before it was added; that case is reported as 'unavailable' rather than crashing.
 * Never throws.
 */
export async function scanPages(maxPages: number = MAX_SCAN_PAGES): Promise<ScanResult> {
  let plugin: typeof import('react-native-document-scanner-plugin');
  try {
    // Lazy require on purpose: the plugin throws at load time when its native module is absent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    plugin = require('react-native-document-scanner-plugin');
  } catch {
    return { status: 'error', code: 'unavailable' };
  }

  try {
    const response = await plugin.default.scanDocument({
      maxNumDocuments: maxPages,
      croppedImageQuality: SCAN_QUALITY,
      responseType: plugin.ResponseType.ImageFilePath,
    });
    if (response.status === plugin.ScanDocumentResponseStatus.Cancel) {
      return { status: 'cancelled' };
    }
    const imageUris = response.scannedImages ?? [];
    return imageUris.length > 0 ? { status: 'success', imageUris } : { status: 'cancelled' };
  } catch {
    return { status: 'error', code: 'failed' };
  }
}

const SCAN_FAILURE_MESSAGES: Record<ScanFailureCode, string> = {
  unavailable: 'The page scanner is not available in this build of the app.',
  failed: 'The scanner could not be opened. Please try again.',
};

export function scanFailureMessage(code: ScanFailureCode): string {
  return SCAN_FAILURE_MESSAGES[code];
}
