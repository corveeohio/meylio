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
      scopes: ['user-top-read'],
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

export async function fetchSpotifyTopArtists(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=20', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Échec de récupération des artistes Spotify');
  const data = (await response.json()) as { items: SpotifyArtist[] };

  const topArtists = data.items.map((artist) => artist.name);
  const topGenres = Array.from(new Set(data.items.flatMap((artist) => artist.genres))).slice(0, 12);

  return { topArtists, topGenres };
}
