import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma.js';
import type { MusicSource } from '@prisma/client';
import { generateAppleMusicDeveloperToken, inferGenresFromArtists } from '../services/appleMusic.js';
import { isMeaningfulGenre, toGenreFamilies } from '../services/genreFamilies.js';

export const musicRouter = Router();

async function upsertMusicProfile(params: {
  userId: string;
  source: MusicSource;
  topGenres: string[];
  topArtists: string[];
  topTracks: string[];
  artistGenres?: string[];
}) {
  const { userId, source, topGenres, topArtists, topTracks } = params;
  const artistStyles = toGenreFamilies(params.artistGenres ?? (await inferGenresFromArtists(topArtists)));
  return prisma.musicProfile.upsert({
    where: { userId },
    create: { userId, source, topGenres, topArtists, topTracks, artistStyles },
    update: { source, topGenres, topArtists, topTracks, artistStyles },
  });
}

// Shared by the Spotify and Apple Music connections: both can come back with no genre
// (or no data at all) for light listeners, which used to save an empty profile that
// scored 0 % with everyone.
async function connectStreamingProfile(source: MusicSource, req: Request, res: Response) {
  const { userId, topArtists, topGenres, topTracks } = req.body as {
    userId?: string;
    topArtists?: string[];
    topGenres?: string[];
    topTracks?: string[];
  };

  if (!userId || !Array.isArray(topArtists) || !Array.isArray(topGenres)) {
    res.status(400).json({ error: 'userId, topArtists et topGenres sont requis' });
    return;
  }

  const artistGenres = await inferGenresFromArtists(topArtists);
  let genres = topGenres.filter(isMeaningfulGenre);
  if (genres.length === 0) genres = artistGenres.filter(isMeaningfulGenre);
  if (genres.length === 0 && topArtists.length === 0) {
    res.status(400).json({ error: 'empty_music_profile', message: 'Aucun artiste ni genre récupéré' });
    return;
  }

  const musicProfile = await upsertMusicProfile({
    userId,
    source,
    topGenres: genres,
    topArtists,
    topTracks: topTracks ?? [],
    artistGenres,
  });

  res.json(musicProfile);
}

musicRouter.post('/connect/spotify', (req, res) => connectStreamingProfile('spotify', req, res));

musicRouter.get('/search-artists', async (req, res) => {
  const query = (req.query.q as string | undefined)?.trim();
  if (!query) {
    res.json([]);
    return;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=8`;
    const response = await fetch(url);
    const data = (await response.json()) as { results?: { artistName?: string }[] };
    const names = (data.results ?? [])
      .map((result) => result.artistName)
      .filter((name): name is string => !!name);
    const uniqueNames = [...new Set(names)];
    res.json(uniqueNames);
  } catch (error) {
    res.json([]);
  }
});

musicRouter.get('/apple-music/developer-token', (_req, res) => {
  try {
    const token = generateAppleMusicDeveloperToken();
    res.json({ token });
  } catch (error) {
    res.status(503).json({ error: 'Apple Music non configuré côté serveur' });
  }
});

musicRouter.post('/connect/apple-music', (req, res) => connectStreamingProfile('apple_music', req, res));

musicRouter.post('/manual', async (req, res) => {
  const { userId, genres, artists } = req.body as {
    userId?: string;
    genres?: string[];
    artists?: string[];
  };

  if (!userId || !Array.isArray(genres) || !Array.isArray(artists) || genres.length === 0) {
    res.status(400).json({ error: 'userId et au moins un genre sont requis' });
    return;
  }

  const musicProfile = await upsertMusicProfile({
    userId,
    source: 'manual',
    topGenres: genres,
    topArtists: artists,
    topTracks: [],
  });

  res.json(musicProfile);
});
