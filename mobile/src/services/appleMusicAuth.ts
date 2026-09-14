type AppleMusicTaste = { topArtists: string[]; topGenres: string[] };

/**
 * Appelle directement l'API Apple Music avec le token développeur (serveur)
 * et le token utilisateur (obtenu via useAppleMusicAuth().getUserToken()).
 * Fonctionne aussi bien sur web (après MusicKit JS) que sur natif (après
 * @superfan-app/apple-music-auth), les deux fournissent ces mêmes tokens.
 */
export async function fetchAppleMusicTaste(developerToken: string, userToken: string): Promise<AppleMusicTaste> {
  const response = await fetch('https://api.music.apple.com/v1/me/history/heavy-rotation', {
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': userToken,
    },
  });
  if (!response.ok) {
    throw new Error('Échec de la récupération des données Apple Music');
  }
  const body = await response.json();
  const items = (body?.data ?? []) as Array<{
    attributes?: { genreNames?: string[]; artistName?: string };
  }>;

  const topGenres = Array.from(new Set(items.flatMap((item) => item.attributes?.genreNames ?? []))).slice(0, 12);
  const topArtists = Array.from(
    new Set(items.map((item) => item.attributes?.artistName).filter((name): name is string => !!name))
  ).slice(0, 20);

  return { topArtists, topGenres };
}
