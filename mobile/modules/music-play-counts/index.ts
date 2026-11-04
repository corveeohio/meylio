import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export type PlayedSong = {
  title: string;
  artist: string;
  genre: string;
  playCount: number;
  lastPlayedAt?: number;
};

type MusicPlayCountsNativeModule = { getMostPlayedSongs(limit: number): Promise<PlayedSong[]> };

// Optional: absent on web, Android and in builds made before this module existed.
const nativeModule =
  Platform.OS === 'ios' ? requireOptionalNativeModule<MusicPlayCountsNativeModule>('MusicPlayCounts') : null;

/** Most played songs of the iPhone music library, by play count. Empty when unavailable. */
export async function getMostPlayedSongs(limit = 300): Promise<PlayedSong[]> {
  if (!nativeModule) return [];
  try {
    return await nativeModule.getMostPlayedSongs(limit);
  } catch {
    return [];
  }
}
