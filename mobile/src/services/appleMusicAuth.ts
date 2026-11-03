type AppleMusicTaste = { topArtists: string[]; topGenres: string[]; topTracks: string[] };

type AppleMusicItem = {
  type?: string;
  attributes?: { genreNames?: string[]; artistName?: string; name?: string };
};

// Apple Music's own catch-all genre, present on nearly every item: it says nothing about taste.
const IGNORED_GENRES = new Set(['Musique', 'Music']);

// Each endpoint covers a different listening habit (heavy rotation is empty for
// accounts that mostly play playlists or have little history), so several are combined.
const SOURCES = [
  '/v1/me/history/heavy-rotation?limit=10',
  '/v1/me/recent/played/tracks?limit=30',
  '/v1/me/recent/played?limit=10',
  '/v1/me/library/songs?limit=100',
  '/v1/me/library/artists?limit=100',
];

async function fetchItems(path: string, developerToken: string, userToken: string): Promise<AppleMusicItem[]> {
  try {
    const response = await fetch(`https://api.music.apple.com${path}`, {
      headers: { Authorization: `Bearer ${developerToken}`, 'Music-User-Token': userToken },
    });
    if (!response.ok) return [];
    const body = await response.json();
    return (body?.data ?? []) as AppleMusicItem[];
  } catch {
    return [];
  }
}

function rankByFrequency(values: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value]) => value);
}

/**
 * Appelle directement l'API Apple Music avec le token développeur (serveur)
 * et le token utilisateur (obtenu via useAppleMusicAuth().getUserToken()).
 * Fonctionne aussi bien sur web (après MusicKit JS) que sur natif (après
 * @superfan-app/apple-music-auth), les deux fournissent ces mêmes tokens.
 */
export async function fetchAppleMusicTaste(developerToken: string, userToken: string): Promise<AppleMusicTaste> {
  const results = await Promise.all(SOURCES.map((path) => fetchItems(path, developerToken, userToken)));
  const items = results.flat();

  const genres = items.flatMap((item) => item.attributes?.genreNames ?? []).filter((genre) => !IGNORED_GENRES.has(genre));
  const artists = items
    .map((item) => (item.type === 'library-artists' ? item.attributes?.name : item.attributes?.artistName))
    .filter((name): name is string => !!name);
  const tracks = items
    .filter((item) => item.type === 'songs' || item.type === 'library-songs')
    .map((item) => (item.attributes?.name && item.attributes.artistName ? `${item.attributes.name} — ${item.attributes.artistName}` : null))
    .filter((track): track is string => !!track);

  return {
    topGenres: rankByFrequency(genres, 12),
    topArtists: rankByFrequency(artists, 20),
    topTracks: rankByFrequency(tracks, 10),
  };
}
