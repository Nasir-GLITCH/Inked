import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Longest edge sent to the cloud engine. Handwriting stays readable and uploads stay small. */
export const MAX_UPLOAD_EDGE = 1800;
const UPLOAD_QUALITY = 0.8;

/**
 * Makes a smaller JPEG copy of an image for uploading. Photos are often 3 to 4 MB, which is
 * slow on mobile data. The original is never touched. If shrinking fails, the original is
 * used, so a problem here never blocks recognition.
 */
export async function prepareImageForUpload(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri, {
      maxWidth: MAX_UPLOAD_EDGE,
      maxHeight: MAX_UPLOAD_EDGE,
    });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: UPLOAD_QUALITY });
    return result.uri;
  } catch {
    return uri;
  }
}
