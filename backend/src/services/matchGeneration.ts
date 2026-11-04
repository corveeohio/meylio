import type { MusicProfile } from '@prisma/client';
import type { CompatibilityResult } from './compatibility.js';
import { lookupTopSong } from './appleMusic.js';
import { normalizeArtistName } from './genreFamilies.js';

const PLAYLIST_SIZE = 12;
// Placeholder written by earlier versions when nobody had top tracks.
const PLACEHOLDER_PREFIX = 'Top titre de ';

function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}

function uniqueByKey(values: string[], key: (value: string) => string): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const k = key(value);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Both people's favourite tracks, alternated so each recognises theirs, then completed
 * with real songs of their artists (shared artists first) found in the iTunes catalog.
 */
export async function generatePlaylist(
  a: MusicProfile,
  b: MusicProfile,
  breakdown: CompatibilityResult['breakdown']
): Promise<string[]> {
  const tracks = uniqueByKey(interleave(a.topTracks, b.topTracks), (track) => track.toLowerCase());
  if (tracks.length >= PLAYLIST_SIZE) return tracks.slice(0, PLAYLIST_SIZE);

  const artists = uniqueByKey(
    [...breakdown.sharedArtists, ...interleave(a.topArtists, b.topArtists)],
    normalizeArtistName
  ).slice(0, PLAYLIST_SIZE - tracks.length);
  const songs = await Promise.all(artists.map(lookupTopSong));

  return uniqueByKey([...tracks, ...songs.filter((song): song is string => !!song)], (track) => track.toLowerCase()).slice(
    0,
    PLAYLIST_SIZE
  );
}

/** Someone's own playlist to share in a chat: their favourite tracks, completed with real songs of their artists. */
export async function buildPersonalPlaylist(profile: MusicProfile): Promise<string[]> {
  const tracks = uniqueByKey(profile.topTracks, (track) => track.toLowerCase());
  if (tracks.length >= PLAYLIST_SIZE) return tracks.slice(0, PLAYLIST_SIZE);
  const songs = await Promise.all(profile.topArtists.slice(0, PLAYLIST_SIZE - tracks.length).map(lookupTopSong));
  return uniqueByKey([...tracks, ...songs.filter((song): song is string => !!song)], (track) => track.toLowerCase()).slice(
    0,
    PLAYLIST_SIZE
  );
}

/** "Mix our playlists": both people's tracks again from their current tastes, in a new order each time. */
export function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Replaces the old "Top titre de X" placeholders with a real song when one is found. */
export async function resolvePlaylistPlaceholders(trackUris: string[]): Promise<string[]> {
  if (!trackUris.some((track) => track.startsWith(PLACEHOLDER_PREFIX))) return trackUris;
  const resolved = await Promise.all(
    trackUris.map(async (track) =>
      track.startsWith(PLACEHOLDER_PREFIX) ? await lookupTopSong(track.slice(PLACEHOLDER_PREFIX.length)) : track
    )
  );
  return resolved.filter((track): track is string => !!track);
}

export type PlaylistTrack = { label: string; spotifyUrl: string; appleMusicUrl: string };

export function toPlaylistTracks(trackUris: string[]): PlaylistTrack[] {
  return trackUris.map((label) => {
    const query = encodeURIComponent(label.replace(' — ', ' '));
    return {
      label,
      spotifyUrl: `https://open.spotify.com/search/${query}`,
      appleMusicUrl: `https://music.apple.com/fr/search?term=${query}`,
    };
  });
}

export function generateIcebreaker(breakdown: CompatibilityResult['breakdown']): string {
  if (breakdown.sharedArtists.length > 0) {
    return `Vous écoutez tous les deux ${breakdown.sharedArtists[0]} — quel est ton morceau préféré ?`;
  }
  if (breakdown.sharedGenres.length > 0) {
    return `Vous partagez un goût pour le ${breakdown.sharedGenres[0]} — un artiste à me conseiller dans ce genre ?`;
  }
  return 'Vos goûts musicaux sont différents mais complémentaires — quelle est ta dernière découverte musicale ?';
}

const FALLBACK_QUESTIONS = [
  'Quel est l’album qui a changé ta vie musicale ?',
  'Concert ou festival, tu préfères quoi ?',
  'Une chanson que tu écoutes en boucle en ce moment ?',
  'Le pire souvenir musical de ta vie ?',
];

export function generateIcebreakerQuestions(breakdown: CompatibilityResult['breakdown']): string[] {
  const questions: string[] = [];
  const [artist1, artist2] = breakdown.sharedArtists;

  if (artist1) {
    questions.push(`Quel est ton morceau préféré de ${artist1} ?`);
  }
  if (artist2) {
    questions.push(`Entre ${artist1} et ${artist2}, lequel tu écoutes le plus ?`);
  }
  if (breakdown.sharedGenres[0]) {
    questions.push(`Quel est ton artiste préféré dans le style ${breakdown.sharedGenres[0]} en ce moment ?`);
  }

  for (const fallback of FALLBACK_QUESTIONS) {
    if (questions.length >= 4) break;
    questions.push(fallback);
  }

  return questions.slice(0, 4);
}
