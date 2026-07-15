import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeCompatibility } from '../services/compatibility.js';
import { findClosestCrossing, haversineDistanceKm } from '../services/geo.js';
import { isPremiumActive } from '../utils/subscription.js';

export const discoveryRouter = Router();

const DEFAULT_MAX_DISTANCE_KM = 25;
const CROSSING_LOOKBACK_DAYS = 7;

async function getExcludedIds(userId: string): Promise<string[]> {
  const [reportedByMe, blockedByMe, blockedMe, likedByMe, matchesAsA, matchesAsB] = await Promise.all([
    prisma.report.findMany({ where: { reporterId: userId }, select: { reportedId: true } }),
    prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    prisma.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
    prisma.like.findMany({ where: { likerId: userId }, select: { likedId: true } }),
    prisma.match.findMany({ where: { userAId: userId }, select: { userBId: true } }),
    prisma.match.findMany({ where: { userBId: userId }, select: { userAId: true } }),
  ]);
  return [
    ...reportedByMe.map((report) => report.reportedId),
    ...blockedByMe.map((block) => block.blockedId),
    ...blockedMe.map((block) => block.blockerId),
    ...likedByMe.map((like) => like.likedId),
    ...matchesAsA.map((match) => match.userBId),
    ...matchesAsB.map((match) => match.userAId),
  ];
}

function passesGenderPreference(
  me: { gender: string | null; genderPreference: string[] },
  candidate: { gender: string | null; genderPreference: string[] }
): boolean {
  const meWantsCandidate = me.genderPreference.length === 0 || (!!candidate.gender && me.genderPreference.includes(candidate.gender));
  const candidateWantsMe = candidate.genderPreference.length === 0 || (!!me.gender && candidate.genderPreference.includes(me.gender));
  return meWantsCandidate && candidateWantsMe;
}

discoveryRouter.get('/pool', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const genresParam = req.query.genres as string | undefined;
  const minAgeParam = req.query.minAge as string | undefined;
  const maxAgeParam = req.query.maxAge as string | undefined;
  const maxDistanceParam = req.query.maxDistanceKm as string | undefined;
  const hasFilters = !!(genresParam || minAgeParam || maxAgeParam || maxDistanceParam);

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
  if (hasFilters && !isPremiumActive(me)) {
    res.status(403).json({
      error: 'premium_required',
      message: 'Passe en Premium pour utiliser les filtres de recherche avancés.',
    });
    return;
  }

  const excludedIds = await getExcludedIds(userId);
  const filterGenres = genresParam ? genresParam.split(',').map((g) => g.toLowerCase()) : null;
  const minAge = minAgeParam ? Number(minAgeParam) : null;
  const maxAge = maxAgeParam ? Number(maxAgeParam) : null;
  const maxDistanceKm = maxDistanceParam ? Number(maxDistanceParam) : null;
  const canFilterByDistance = maxDistanceKm !== null && me.lastLatitude !== null && me.lastLongitude !== null;

  const candidates = await prisma.user.findMany({
    where: { id: { notIn: [userId, ...excludedIds] }, isSuspended: false },
    include: { musicProfile: true },
  });

  const pool = candidates
    .filter((candidate) => candidate.musicProfile !== null)
    .filter((candidate) => passesGenderPreference(me, candidate))
    .filter((candidate) => {
      if (!filterGenres) return true;
      return candidate.musicProfile!.topGenres.some((genre) => filterGenres.includes(genre.toLowerCase()));
    })
    .filter((candidate) => {
      if (minAge === null && maxAge === null) return true;
      if (candidate.age === null) return false;
      if (minAge !== null && candidate.age < minAge) return false;
      if (maxAge !== null && candidate.age > maxAge) return false;
      return true;
    })
    .filter((candidate) => {
      if (!canFilterByDistance) return true;
      if (candidate.lastLatitude === null || candidate.lastLongitude === null) return false;
      const distanceKm = haversineDistanceKm(
        me.lastLatitude!,
        me.lastLongitude!,
        candidate.lastLatitude,
        candidate.lastLongitude
      );
      return distanceKm <= maxDistanceKm!;
    })
    .map((candidate) => {
      const compatibility = computeCompatibility(myProfile, candidate.musicProfile!);
      const canComputeDistance =
        me.lastLatitude !== null &&
        me.lastLongitude !== null &&
        candidate.lastLatitude !== null &&
        candidate.lastLongitude !== null;
      const distanceKm = canComputeDistance
        ? Math.round(
            haversineDistanceKm(me.lastLatitude!, me.lastLongitude!, candidate.lastLatitude!, candidate.lastLongitude!) *
              10
          ) / 10
        : null;
      return {
        userId: candidate.id,
        displayName: candidate.displayName,
        age: candidate.age,
        isVerified: candidate.isVerified,
        relationshipIntent: candidate.relationshipIntent,
        lastActiveAt: candidate.lastActiveAt,
        distanceKm,
        ...compatibility,
      };
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
  const requestedMaxDistanceKm = Number(req.query.maxDistanceKm);
  const maxDistanceKm =
    Number.isFinite(requestedMaxDistanceKm) && requestedMaxDistanceKm > 0
      ? requestedMaxDistanceKm
      : me.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM;

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [userId, ...excludedIds] },
      locationOptIn: true,
      lastLatitude: { not: null },
      lastLongitude: { not: null },
      isSuspended: false,
    },
    include: { musicProfile: true },
  });

  const crossingSince = new Date(Date.now() - CROSSING_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const myPings = await prisma.locationPing.findMany({
    where: { userId, createdAt: { gte: crossingSince } },
    select: { latitude: true, longitude: true, createdAt: true },
  });

  const nearby = await Promise.all(
    candidates
      .filter((candidate) => candidate.musicProfile !== null)
      .filter((candidate) => passesGenderPreference(me, candidate))
      .map(async (candidate) => {
        const distanceKm = haversineDistanceKm(
          me.lastLatitude!,
          me.lastLongitude!,
          candidate.lastLatitude!,
          candidate.lastLongitude!
        );
        const compatibility = computeCompatibility(myProfile, candidate.musicProfile!);
        const theirPings = await prisma.locationPing.findMany({
          where: { userId: candidate.id, createdAt: { gte: crossingSince } },
          select: { latitude: true, longitude: true, createdAt: true },
        });
        const crossing = findClosestCrossing(myPings, theirPings);
        return {
          userId: candidate.id,
          displayName: candidate.displayName,
          age: candidate.age,
          isVerified: candidate.isVerified,
          relationshipIntent: candidate.relationshipIntent,
          lastActiveAt: candidate.lastActiveAt,
          distanceKm: Math.round(distanceKm * 10) / 10,
          crossedAt: crossing?.crossedAt ?? null,
          crossedDistanceM: crossing?.distanceMeters ?? null,
          ...compatibility,
        };
      })
  );

  const filtered = nearby
    .filter((candidate) => candidate.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(filtered);
});
