import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Re-encodes an image to JPEG regardless of its source format (HEIC photos
 * from the iOS library fail AWS Rekognition's face detection/comparison,
 * which only accepts JPEG or PNG).
 */
export async function ensureJpeg(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return result.uri;
}
