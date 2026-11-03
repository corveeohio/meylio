import type { MusicProfile, User } from '@prisma/client';
import { isMeaningfulGenre } from './genreFamilies.js';

/** A profile with no genre and no artist scores 0 % with everyone. */
export function hasUsableMusicProfile(profile: MusicProfile | null): profile is MusicProfile {
  return !!profile && (profile.topArtists.length > 0 || profile.topGenres.some(isMeaningfulGenre));
}

/**
 * Only people who finished onboarding are shown to others: a card without pseudo, age
 * or musical taste reads as "Profil Meylio, 0 % compatible" and cannot lead anywhere.
 */
export function isDiscoverable(user: User & { musicProfile: MusicProfile | null }): boolean {
  return !!user.displayName && user.age !== null && !user.isSuspended && hasUsableMusicProfile(user.musicProfile);
}
