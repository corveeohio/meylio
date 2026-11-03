import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';

export const spotifyDiscovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export const spotifyRedirectUri = AuthSession.makeRedirectUri();

export function useSpotifyAuthRequest() {
  return AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: ['user-top-read', 'user-follow-read'],
      usePKCE: true,
      redirectUri: spotifyRedirectUri,
    },
    spotifyDiscovery
  );
}

export async function exchangeSpotifyCode(code: string, codeVerifier: string) {
  return AuthSession.exchangeCodeAsync(
    {
      clientId: SPOTIFY_CLIENT_ID,
      code,
      redirectUri: spotifyRedirectUri,
      extraParams: { code_verifier: codeVerifier },
    },
    spotifyDiscovery
  );
}

type SpotifyArtist = {
  name: string;
  genres: string[];
};

type SpotifyTrack = {
  name: string;
  artists: { name: string }[];
};

// Thrown when Spotify refuses the account itself: while the Spotify app is in development
// mode, only the accounts added to its allowlist can read their data.
export class SpotifyAccessDeniedError extends Error {}

// Light or new listeners often have nothing over the default 6 months, so the other
// periods (all time, last 4 weeks) are tried before giving up.
const TIME_RANGES = ['medium_term', 'long_term', 'short_term'];

export async function fetchSpotifyTopArtists(accessToken: string) {
  let items: SpotifyArtist[] = [];
  for (const timeRange of TIME_RANGES) {
    const response = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=20&time_range=${timeRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 403) throw new SpotifyAccessDeniedError('spotify_access_denied');
    if (!response.ok) throw new Error('Échec de récupération des artistes Spotify');
    items = ((await response.json()) as { items: SpotifyArtist[] }).items;
    if (items.length > 0) break;
  }

  if (items.length === 0) {
    const response = await fetch('https://api.spotify.com/v1/me/following?type=artist&limit=20', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) items = ((await response.json()) as { artists: { items: SpotifyArtist[] } }).artists.items;
  }

  const topArtists = items.map((artist) => artist.name);
  const topGenres = Array.from(new Set(items.flatMap((artist) => artist.genres ?? []))).slice(0, 12);

  return { topArtists, topGenres };
}

export async function fetchSpotifyTopTracks(accessToken: string) {
  for (const timeRange of ['short_term', ...TIME_RANGES.filter((range) => range !== 'short_term')]) {
    const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=${timeRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { items: SpotifyTrack[] };
    if (data.items.length > 0) {
      return data.items.map((track) => `${track.name} — ${track.artists.map((a) => a.name).join(', ')}`);
    }
  }
  return [];
}
