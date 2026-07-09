import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeCompatibility } from '../services/compatibility.js';
import { haversineDistanceKm } from '../services/geo.js';

export const discoveryRouter = Router();

const DEFAULT_MAX_DISTANCE_KM = 25;

async function getExcludedIds(userId: string): Promise<string[]> {
  const reportedByMe = await prisma.report.findMany({
    where: { reporterId: userId },
    select: { reportedId: true },
  });
  return reportedByMe.map((report) => report.reportedId);
}

discoveryRouter.get('/pool', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const myProfile = await prisma.musicProfile.findUnique({ where: { userId } });
  if (!myProfile) {
    res.status(400).json({ error: "Complète d'abord ton profil musical" });
    return;
  }

  const excludedIds = await getExcludedIds(userId);

  const candidates = await prisma.musicProfile.findMany({
    where: { userId: { notIn: [userId, ...excludedIds] } },
  });

  const pool = candidates
    .map((candidate) => {
      const compatibility = computeCompatibility(myProfile, candidate);
      return { userId: candidate.userId, ...compatibility };
    })
    .sort((a, b) => b.score - a.score);

  res.json(pool);
});

discoveryRouter.get('/proximity', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const [me, myProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.musicProfile.findUnique({ where: { userId } }),
  ]);

  if (!me) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (!myProfile) {
    res.status(400).json({ error: "Complète d'abord ton profil musical" });
    return;
  }
  if (!me.locationOptIn || me.lastLatitude === null || me.lastLongitude === null) {
    res.status(400).json({ error: 'Active la géolocalisation dans Paramètres pour utiliser ce mode' });
    return;
  }

  const excludedIds = await getExcludedIds(userId);
  const maxDistanceKm = me.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM;

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [userId, ...excludedIds] },
      locationOptIn: true,
      lastLatitude: { not: null },
      lastLongitude: { not: null },
    },
    include: { musicProfile: true },
  });

  const nearby = candidates
    .filter((candidate) => candidate.musicProfile !== null)
    .map((candidate) => {
      const distanceKm = haversineDistanceKm(
        me.lastLatitude!,
        me.lastLongitude!,
        candidate.lastLatitude!,
        candidate.lastLongitude!
      );
      const compatibility = computeCompatibility(myProfile, candidate.musicProfile!);
      return { userId: candidate.id, distanceKm: Math.round(distanceKm * 10) / 10, ...compatibility };
    })
    .filter((candidate) => candidate.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(nearby);
});
