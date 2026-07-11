import { prisma } from '../prisma.js';
import { findClosestCrossing } from './geo.js';
import { sendPushNotification } from './pushNotifications.js';

const CROSSING_LOOKBACK_DAYS = 7;

function passesGenderPreference(
  me: { gender: string | null; genderPreference: string[] },
  candidate: { gender: string | null; genderPreference: string[] }
): boolean {
  const meWantsCandidate =
    me.genderPreference.length === 0 || (!!candidate.gender && me.genderPreference.includes(candidate.gender));
  const candidateWantsMe =
    candidate.genderPreference.length === 0 || (!!me.gender && candidate.genderPreference.includes(me.gender));
  return meWantsCandidate && candidateWantsMe;
}

export async function detectNewCrossings(userId: string): Promise<void> {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || !me.locationOptIn || me.lastLatitude === null || me.lastLongitude === null) return;

  const [reportedByMe, blockedByMe, blockedMe] = await Promise.all([
    prisma.report.findMany({ where: { reporterId: userId }, select: { reportedId: true } }),
    prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    prisma.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
  ]);
  const excludedIds = [
    ...reportedByMe.map((r) => r.reportedId),
    ...blockedByMe.map((b) => b.blockedId),
    ...blockedMe.map((b) => b.blockerId),
  ];

  const crossingSince = new Date(Date.now() - CROSSING_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const myPings = await prisma.locationPing.findMany({
    where: { userId, createdAt: { gte: crossingSince } },
    select: { latitude: true, longitude: true, createdAt: true },
  });
  if (myPings.length === 0) return;

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [userId, ...excludedIds] },
      locationOptIn: true,
      lastLatitude: { not: null },
      lastLongitude: { not: null },
    },
  });

  for (const candidate of candidates) {
    if (!passesGenderPreference(me, candidate)) continue;

    const theirPings = await prisma.locationPing.findMany({
      where: { userId: candidate.id, createdAt: { gte: crossingSince } },
      select: { latitude: true, longitude: true, createdAt: true },
    });
    const crossing = findClosestCrossing(myPings, theirPings);
    if (!crossing) continue;

    const [userAId, userBId] = [userId, candidate.id].sort();
    const existing = await prisma.crossingAlert.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (existing) continue;

    await prisma.crossingAlert.create({ data: { userAId, userBId } });

    sendPushNotification(
      me.pushToken,
      'Croisement musical 🎧',
      'Tu as croisé quelqu’un de compatible tout près de toi !',
      { type: 'crossing', userId: candidate.id }
    );
    sendPushNotification(
      candidate.pushToken,
      'Croisement musical 🎧',
      'Tu as croisé quelqu’un de compatible tout près de toi !',
      { type: 'crossing', userId }
    );
  }
}
