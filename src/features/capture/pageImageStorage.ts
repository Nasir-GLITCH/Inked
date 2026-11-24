import { Directory, File, Paths } from 'expo-file-system';

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

function extensionOf(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  const extension = match?.[1]?.toLowerCase();
  return extension && SUPPORTED_EXTENSIONS.has(extension) ? extension : 'jpg';
}

/**
 * Copies a scanned or imported page into the app's own storage, in a folder per user, so
 * it survives the system clearing its cache. Returns the new file URI.
 */
export async function persistPageImage(
  userId: string,
  noteId: string,
  sourceUri: string,
): Promise<string> {
  const directory = new Directory(Paths.document, 'pages', userId);
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `${noteId}.${extensionOf(sourceUri)}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}

/** Deletes a stored page image. Returns false when it could not be removed. */
export function removePageImage(uri: string): boolean {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
    return true;
  } catch {
    return false;
  }
}
