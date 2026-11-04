import { getMostPlayedSongs, type PlayedSong } from '../../modules/music-play-counts';

// `failedStatuses` lists the HTTP errors Apple returned: when every source fails, the
// problem is the authorization (token, subscription), not an empty listening history.
type AppleMusicTaste = { topArtists: string[]; topGenres: string[]; topTracks: string[]; failedStatuses: number[] };

type AppleMusicItem = {
  type?: string;
  attributes?: { genreNames?: string[]; artistName?: string; name?: string };
};

// Apple Music's own catch-all genre, present on nearly every item: it says nothing about taste.
const IGNORED_GENRES = new Set(['Musique', 'Music']);

// Each endpoint covers a different listening habit (heavy rotation is empty for
// accounts that mostly play playlists or have little history), so several are combined.
// What is played now weighs far more than the library: an old library full of one
// artist must not outrank what the person actually listens to these days.
const SOURCES = [
  { path: '/v1/me/history/heavy-rotation?limit=10', weight: 6, recent: true },
  { path: '/v1/me/recent/played/tracks?limit=30', weight: 5, recent: true },
  { path: '/v1/me/recent/played?limit=10', weight: 4, recent: true },
  { path: '/v1/me/library/recently-added?limit=25', weight: 2, recent: false },
  { path: '/v1/me/library/songs?limit=100', weight: 1, recent: false },
  { path: '/v1/me/library/artists?limit=100', weight: 1, recent: false },
  { path: '/v1/me/library/albums?limit=100', weight: 1, recent: false },
];

async function fetchItems(
  path: string,
  developerToken: string,
  userToken: string
): Promise<{ items: AppleMusicItem[]; failedStatus: number | null }> {
  try {
    const response = await fetch(`https://api.music.apple.com${path}`, {
      headers: { Authorization: `Bearer ${developerToken}`, 'Music-User-Token': userToken },
    });
    if (!response.ok) return { items: [], failedStatus: response.status };
    const body = await response.json();
    return { items: (body?.data ?? []) as AppleMusicItem[], failedStatus: null };
  } catch {
    return { items: [], failedStatus: 0 };
  }
}

// Each source contributes its share of mentions times its weight, so a source with 100
// library items does not drown out 30 recent plays just by being longer.
function rankByWeightedShare(perSource: { values: string[]; weight: number }[], limit: number): string[] {
  const scores = new Map<string, number>();
  for (const { values, weight } of perSource) {
    if (values.length === 0) continue;
    for (const value of values) scores.set(value, (scores.get(value) ?? 0) + weight / values.length);
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value]) => value);
}

function artistOf(item: AppleMusicItem): string | undefined {
  return item.type === 'library-artists' ? item.attributes?.name : item.attributes?.artistName;
}

function trackOf(item: AppleMusicItem): string | null {
  if (item.type !== 'songs' && item.type !== 'library-songs') return null;
  const { name, artistName } = item.attributes ?? {};
  return name && artistName ? `${name} — ${artistName}` : null;
}

const DAY_MS = 24 * 3600 * 1000;

// Plays count fully when recent and fade with time, so a song played 300 times
// two years ago does not outrank what someone listens to this month.
function playScore(song: PlayedSong): number {
  const ageDays = song.lastPlayedAt ? (Date.now() - song.lastPlayedAt) / DAY_MS : Infinity;
  const recency = ageDays <= 30 ? 1 : ageDays <= 180 ? 0.6 : 0.3;
  return song.playCount * recency;
}

function rankByScore(entries: [string, number][], limit: number): string[] {
  const scores = new Map<string, number>();
  for (const [key, score] of entries) if (key) scores.set(key, (scores.get(key) ?? 0) + score);
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key]) => key);
}

// Play-count ranking first, then the API ranking for anything it did not cover.
function mergeRankings(primary: string[], secondary: string[], limit: number): string[] {
  return [...new Set([...primary, ...secondary])].slice(0, limit);
}

/**
 * Appelle directement l'API Apple Music avec le token développeur (serveur)
 * et le token utilisateur (obtenu via useAppleMusicAuth().getUserToken()).
 * Fonctionne aussi bien sur web (après MusicKit JS) que sur natif (après
 * @superfan-app/apple-music-auth), les deux fournissent ces mêmes tokens.
 */
export async function fetchAppleMusicTaste(developerToken: string, userToken: string): Promise<AppleMusicTaste> {
  const [results, playedSongs] = await Promise.all([
    Promise.all(SOURCES.map((source) => fetchItems(source.path, developerToken, userToken))),
    getMostPlayedSongs(),
  ]);
  const failedStatuses = results.map((result) => result.failedStatus).filter((status): status is number => status !== null);

  const perSource = (pick: (item: AppleMusicItem) => string[]) =>
    results.map((result, index) => ({ values: result.items.flatMap(pick), weight: SOURCES[index].weight }));

  const topGenres = rankByWeightedShare(
    perSource((item) => (item.attributes?.genreNames ?? []).filter((genre) => !IGNORED_GENRES.has(genre))),
    12
  );
  const topArtists = rankByWeightedShare(perSource((item) => (artistOf(item) ? [artistOf(item)!] : [])), 20);

  // The first track is shown as the "anthem of the moment": take actual recent plays in
  // the order Apple returns them (most recent first), and the library only as a fallback.
  const recentTracks = results.flatMap((result, index) =>
    SOURCES[index].recent ? result.items.map(trackOf).filter((track): track is string => !!track) : []
  );
  const libraryTracks = results.flatMap((result, index) =>
    SOURCES[index].recent ? [] : result.items.map(trackOf).filter((track): track is string => !!track)
  );
  const apiTracks = [...new Set(recentTracks.length > 0 ? recentTracks : libraryTracks)];

  // Real play counts from the iPhone library, when available, are the strongest signal.
  if (playedSongs.length > 0) {
    const scored = playedSongs.map((song) => ({ song, score: playScore(song) }));
    const playArtists = rankByScore(scored.map(({ song, score }) => [song.artist, score]), 20);
    const playGenres = rankByScore(
      scored.filter(({ song }) => !IGNORED_GENRES.has(song.genre)).map(({ song, score }) => [song.genre, score]),
      12
    );
    // Anthem of the moment: the most played song among those played in the last two weeks.
    const recentPlays = scored
      .filter(({ song }) => song.lastPlayedAt && Date.now() - song.lastPlayedAt <= 14 * DAY_MS)
      .sort((a, b) => b.song.playCount - a.song.playCount);
    const byScore = [...scored].sort((a, b) => b.score - a.score);
    const playTracks = [...recentPlays, ...byScore].map(({ song }) => `${song.title} — ${song.artist}`);
    return {
      topArtists: mergeRankings(playArtists, topArtists, 20),
      topGenres: mergeRankings(playGenres, topGenres, 12),
      topTracks: mergeRankings(playTracks, apiTracks, 10),
      failedStatuses,
    };
  }

  return { topArtists, topGenres, topTracks: apiTracks.slice(0, 10), failedStatuses };
}
