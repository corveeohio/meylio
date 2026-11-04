import type { Response } from 'express';
import type { MusicProfile, User } from '@prisma/client';
import { isMeaningfulGenre } from './genreFamilies.js';

// Feeds are never blocked for an empty music profile (that left people on a dead screen):
// they still load, and this header lets the app show a "complete your tastes" banner.
export const EMPTY_MUSIC_PROFILE_HEADER = 'X-Meylio-Empty-Music-Profile';

/**
 * The viewer's profile to score against. A missing or empty one never blocks a feed: it
 * is flagged for the banner and scored as an empty profile instead.
 */
export function viewerMusicProfile(profile: MusicProfile | null, userId: string, res: Response): MusicProfile {
  if (hasUsableMusicProfile(profile)) return profile;
  res.setHeader(EMPTY_MUSIC_PROFILE_HEADER, '1');
  return profile ?? emptyMusicProfile(userId);
}

/** Stand-in for someone who has no music profile yet: scores 0 % with everyone. */
export function emptyMusicProfile(userId: string): MusicProfile {
  return {
    id: '',
    userId,
    source: 'manual',
    topArtists: [],
    topGenres: [],
    topTracks: [],
    artistStyles: [],
    energy: null,
    valence: null,
    tempoAvg: null,
    updatedAt: new Date(),
  };
}

/** A profile with no genre and no artist scores 0 % with everyone. */
export function hasUsableMusicProfile(profile: MusicProfile | null): profile is MusicProfile {
  return !!profile && (profile.topArtists.length > 0 || profile.topGenres.some(isMeaningfulGenre));
}

/**
 * Only people who finished onboarding are shown to others: a card without pseudo or age
 * reads as an anonymous "Profil Meylio" and cannot lead anywhere.
 */
export function isDiscoverable(user: User & { musicProfile: MusicProfile | null }): boolean {
  // An empty music profile does not hide anyone: many accounts got one from an old Apple
  // Music bug, and hiding them emptied the feeds. They score 0 % and so rank last.
  return !!user.displayName && user.age !== null && !user.isSuspended && user.musicProfile !== null;
}
