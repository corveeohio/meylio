import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeCompatibility } from '../services/compatibility.js';

export const compatTestRouter = Router();

const MAX_ITEMS = 10;
const MAX_NAME_LEN = 40;

function sanitizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= MAX_NAME_LEN)
    .slice(0, MAX_ITEMS);
}

compatTestRouter.post('/', async (req, res) => {
  const { name, genres, artists } = req.body as { name?: string; genres?: unknown; artists?: unknown };
  const safeGenres = sanitizeList(genres);
  const safeArtists = sanitizeList(artists);
  if (safeGenres.length === 0 && safeArtists.length === 0) {
    res.status(400).json({ error: 'Ajoute au moins un genre ou un artiste' });
    return;
  }

  const test = await prisma.compatTest.create({
    data: {
      aName: name?.trim().slice(0, MAX_NAME_LEN) || null,
      aGenres: safeGenres,
      aArtists: safeArtists,
    },
  });
  res.json({ id: test.id });
});

compatTestRouter.get('/:id', async (req, res) => {
  const test = await prisma.compatTest.findUnique({ where: { id: req.params.id } });
  if (!test) {
    res.status(404).json({ error: 'Test introuvable ou expiré' });
    return;
  }

  if (!test.joinedAt) {
    res.json({ status: 'waiting_for_b', aName: test.aName });
    return;
  }

  const result = computeCompatibility(
    { topGenres: test.aGenres, topArtists: test.aArtists, energy: null, valence: null, tempoAvg: null } as any,
    { topGenres: test.bGenres, topArtists: test.bArtists, energy: null, valence: null, tempoAvg: null } as any
  );

  res.json({
    status: 'complete',
    aName: test.aName,
    bName: test.bName,
    score: result.score,
    sharedGenres: result.breakdown.sharedGenres,
    sharedArtists: result.breakdown.sharedArtists,
  });
});

compatTestRouter.post('/:id/join', async (req, res) => {
  const { name, genres, artists } = req.body as { name?: string; genres?: unknown; artists?: unknown };
  const safeGenres = sanitizeList(genres);
  const safeArtists = sanitizeList(artists);
  if (safeGenres.length === 0 && safeArtists.length === 0) {
    res.status(400).json({ error: 'Ajoute au moins un genre ou un artiste' });
    return;
  }

  const test = await prisma.compatTest.findUnique({ where: { id: req.params.id } });
  if (!test) {
    res.status(404).json({ error: 'Test introuvable ou expiré' });
    return;
  }
  if (test.joinedAt) {
    res.status(409).json({ error: 'Ce test a déjà été complété' });
    return;
  }

  const updated = await prisma.compatTest.update({
    where: { id: req.params.id },
    data: {
      bName: name?.trim().slice(0, MAX_NAME_LEN) || null,
      bGenres: safeGenres,
      bArtists: safeArtists,
      joinedAt: new Date(),
    },
  });

  const result = computeCompatibility(
    { topGenres: updated.aGenres, topArtists: updated.aArtists, energy: null, valence: null, tempoAvg: null } as any,
    { topGenres: updated.bGenres, topArtists: updated.bArtists, energy: null, valence: null, tempoAvg: null } as any
  );

  res.json({
    status: 'complete',
    aName: updated.aName,
    bName: updated.bName,
    score: result.score,
    sharedGenres: result.breakdown.sharedGenres,
    sharedArtists: result.breakdown.sharedArtists,
  });
});
