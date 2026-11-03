import jwt from 'jsonwebtoken';

export function generateAppleMusicDeveloperToken(): string {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    throw new Error('Apple Music credentials not configured');
  }

  return jwt.sign({}, privateKey.replace(/\\n/g, '\n'), {
    algorithm: 'ES256',
    expiresIn: '1h',
    issuer: teamId,
    header: { alg: 'ES256', kid: keyId },
  });
}

const ARTIST_LOOKUP_LIMIT = 8;
const ARTIST_LOOKUP_TIMEOUT_MS = 4000;

async function lookupArtistGenre(name: string): Promise<string | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=1&country=fr&lang=fr_fr`;
    const response = await fetch(url, { signal: AbortSignal.timeout(ARTIST_LOOKUP_TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = (await response.json()) as { results?: { primaryGenreName?: string }[] };
    return data.results?.[0]?.primaryGenreName ?? null;
  } catch {
    return null;
  }
}

/**
 * Spotify no longer returns genres for many artists and Apple Music library items often
 * have none, which left profiles with artists but no genres. The public iTunes catalog
 * gives each artist's primary genre, which is enough to rebuild a genre profile.
 */
/** Most popular song of an artist in the public iTunes catalog, as "Titre — Artiste". */
export async function lookupTopSong(artist: string): Promise<string | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&attribute=artistTerm&limit=1&country=fr`;
    const response = await fetch(url, { signal: AbortSignal.timeout(ARTIST_LOOKUP_TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = (await response.json()) as { results?: { trackName?: string; artistName?: string }[] };
    const song = data.results?.[0];
    return song?.trackName && song.artistName ? `${song.trackName} — ${song.artistName}` : null;
  } catch {
    return null;
  }
}

export async function inferGenresFromArtists(artists: string[]): Promise<string[]> {
  const genres = await Promise.all(artists.slice(0, ARTIST_LOOKUP_LIMIT).map(lookupArtistGenre));
  return [...new Set(genres.filter((genre): genre is string => !!genre))];
}
