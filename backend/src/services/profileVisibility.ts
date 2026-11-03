import type { Response } from 'express';
import type { MusicProfile, User } from '@prisma/client';
import { isMeaningfulGenre } from './genreFamilies.js';

// Feeds are never blocked for an empty music profile (that left people on a dead screen):
// they still load, and this header lets the app show a "complete your tastes" banner.
export const EMPTY_MUSIC_PROFILE_HEADER = 'X-Meylio-Empty-Music-Profile';

/** Sends 400 when there is no music profile at all; flags an empty one without blocking. */
export function checkViewerMusicProfile(profile: MusicProfile | null, res: Response): profile is MusicProfile {
  if (!profile) {
    res.status(400).json({ error: "Complète d'abord ton profil musical" });
    return false;
  }
  if (!hasUsableMusicProfile(profile)) res.setHeader(EMPTY_MUSIC_PROFILE_HEADER, '1');
  return true;
}

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
