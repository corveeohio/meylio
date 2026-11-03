import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeCompatibility } from '../services/compatibility.js';
import { isDiscoverable, viewerMusicProfile } from '../services/profileVisibility.js';

export const eventsRouter = Router();

eventsRouter.get('/active', async (_req, res) => {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { startAt: { lte: now }, endAt: { gte: now } },
    include: { _count: { select: { participants: true } } },
    orderBy: { startAt: 'asc' },
  });

  res.json(
    events.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      artistName: event.artistName,
      startAt: event.startAt,
      endAt: event.endAt,
      latitude: event.latitude,
      longitude: event.longitude,
      radiusKm: event.radiusKm,
      participantCount: event._count.participants,
    }))
  );
});

eventsRouter.post('/:id/join', async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId est requis' });
    return;
  }

  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    res.status(404).json({ error: 'Événement introuvable' });
    return;
  }
  if (event.endAt < new Date()) {
    res.status(400).json({ error: 'Cet événement est terminé' });
    return;
  }

  await prisma.eventParticipant.upsert({
    where: { eventId_userId: { eventId: event.id, userId } },
    create: { eventId: event.id, userId },
    update: {},
  });

  res.json({ status: 'joined' });
});

eventsRouter.post('/:id/leave', async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId est requis' });
    return;
  }

  await prisma.eventParticipant.deleteMany({ where: { eventId: req.params.id, userId } });
  res.json({ status: 'left' });
});

eventsRouter.get('/:id/candidates', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, include: { musicProfile: true } });
  if (!me) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const myProfile = viewerMusicProfile(me.musicProfile, userId, res);

  const participants = await prisma.eventParticipant.findMany({
    where: { eventId: req.params.id, userId: { not: userId } },
    include: { user: { include: { musicProfile: true } } },
  });

  const candidates = participants
    .filter((p) => isDiscoverable(p.user))
    .map((p) => {
      const result = computeCompatibility(myProfile, p.user.musicProfile!);
      return {
        userId: p.userId,
        displayName: p.user.displayName,
        score: result.score,
        breakdown: result.breakdown,
      };
    })
    .sort((a, b) => b.score - a.score);

  res.json(candidates);
});
