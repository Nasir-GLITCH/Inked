import { requireOptionalNativeModule, type NativeModule } from 'expo';

import type { NativeRecognition } from './InkedOcr.types';

declare class InkedOcrModule extends NativeModule {
  /** Recognizes text in a local image (file://, content:// or an absolute path). */
  recognizeText(imageUri: string): Promise<NativeRecognition>;
}

/**
 * The native module, or null when this build does not contain it (Expo Go, iOS, or a
 * development build made before the module was added). Callers must handle null.
 */
export default requireOptionalNativeModule<InkedOcrModule>('InkedOcr');
