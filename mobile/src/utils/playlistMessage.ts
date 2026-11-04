// A playlist shared in a chat travels as a plain message so that older app versions
// still show it as readable text; newer versions detect the header and render a card.
const PLAYLIST_HEADER = '🎧 Ma playlist Meylio';

export type MusicService = 'spotify' | 'apple_music';

export function buildPlaylistMessage(tracks: string[]): string {
  return [PLAYLIST_HEADER, ...tracks.map((track, index) => `${index + 1}. ${track}`)].join('\n');
}

/** The tracks of a shared playlist message, or null for an ordinary message. */
export function parsePlaylistMessage(content: string): string[] | null {
  const [header, ...lines] = content.split('\n');
  if (header !== PLAYLIST_HEADER) return null;
  return lines.map((line) => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}

export function trackSearchUrl(track: string, service: MusicService): string {
  const query = encodeURIComponent(track.replace(' — ', ' '));
  return service === 'spotify'
    ? `https://open.spotify.com/search/${query}`
    : `https://music.apple.com/fr/search?term=${query}`;
}
