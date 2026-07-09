import { Router } from 'express';
import { prisma } from '../prisma.js';
import type { MusicSource } from '@prisma/client';
import { generateAppleMusicDeveloperToken } from '../services/appleMusic.js';

export const musicRouter = Router();

function upsertMusicProfile(params: {
  userId: string;
  source: MusicSource;
  topGenres: string[];
  topArtists: string[];
  topTracks: string[];
}) {
  const { userId, source, topGenres, topArtists, topTracks } = params;
  return prisma.musicProfile.upsert({
    where: { userId },
    create: { userId, source, topGenres, topArtists, topTracks },
    update: { source, topGenres, topArtists, topTracks },
  });
}

musicRouter.post('/connect/spotify', async (req, res) => {
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

  const musicProfile = await upsertMusicProfile({
    userId,
    source: 'spotify',
    topGenres,
    topArtists,
    topTracks: topTracks ?? [],
  });

  res.json(musicProfile);
});

musicRouter.get('/apple-music/developer-token', (_req, res) => {
  try {
    const token = generateAppleMusicDeveloperToken();
    res.json({ token });
  } catch (error) {
    res.status(503).json({ error: 'Apple Music non configuré côté serveur' });
  }
});

musicRouter.post('/connect/apple-music', async (req, res) => {
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

  const musicProfile = await upsertMusicProfile({
    userId,
    source: 'apple_music',
    topGenres,
    topArtists,
    topTracks: topTracks ?? [],
  });

  res.json(musicProfile);
});

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
