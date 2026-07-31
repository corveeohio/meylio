import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copies a picked asset (which can be a ph:// or other non-local URI on iOS)
 * into the app's own cache directory so it's guaranteed readable by fetch/FormData.
 * Returns the original uri unchanged on web or if no cache directory is available.
 */
export async function ensureLocalFileUri(uri: string, fileName: string): Promise<string> {
  if (uri.startsWith('file://') || !FileSystem.cacheDirectory) {
    return uri;
  }

  const destination = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (error) {
    console.warn('[ensureLocalFileUri] Échec de la copie locale, utilisation de l’URI d’origine.', error);
    return uri;
  }
}
