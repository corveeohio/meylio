import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeCompatibility } from '../services/compatibility.js';
import { generateIcebreaker, generatePlaylist } from '../services/matchGeneration.js';

export const matchesRouter = Router();

const FREE_DAILY_LIKE_LIMIT = 5;

matchesRouter.post('/like/:userId', async (req, res) => {
  const likedId = req.params.userId;
  const { userId: likerId } = req.body as { userId?: string };

  if (!likerId) {
    res.status(400).json({ error: 'userId (celui qui like) est requis' });
    return;
  }
  if (likerId === likedId) {
    res.status(400).json({ error: 'Impossible de se liker soi-même' });
    return;
  }

  const existingLike = await prisma.like.findUnique({
    where: { likerId_likedId: { likerId, likedId } },
  });

  if (!existingLike) {
    const liker = await prisma.user.findUnique({ where: { id: likerId } });
    if (liker?.subscriptionStatus === 'free') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const likesToday = await prisma.like.count({
        where: { likerId, createdAt: { gte: startOfDay } },
      });
      if (likesToday >= FREE_DAILY_LIKE_LIMIT) {
        res.status(403).json({
          error: 'daily_limit_reached',
          message: `Limite de ${FREE_DAILY_LIKE_LIMIT} likes/jour atteinte. Passe en Premium pour liker sans limite.`,
        });
        return;
      }
    }
  }

  await prisma.like.upsert({
    where: { likerId_likedId: { likerId, likedId } },
    create: { likerId, likedId },
    update: {},
  });

  const reciprocalLike = await prisma.like.findUnique({
    where: { likerId_likedId: { likerId: likedId, likedId: likerId } },
  });

  if (!reciprocalLike) {
    res.json({ status: 'pending', message: 'Like enregistré, en attente de réciprocité' });
    return;
  }

  const [userAId, userBId] = [likerId, likedId].sort();
  const existingMatch = await prisma.match.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    include: { playlist: true },
  });
  if (existingMatch) {
    res.json({ status: 'matched', match: existingMatch });
    return;
  }

  const [profileA, profileB] = await Promise.all([
    prisma.musicProfile.findUnique({ where: { userId: userAId } }),
    prisma.musicProfile.findUnique({ where: { userId: userBId } }),
  ]);

  if (!profileA || !profileB) {
    res.status(400).json({ error: 'Les deux utilisateurs doivent avoir un profil musical' });
    return;
  }

  const compatibility = computeCompatibility(profileA, profileB);
  const trackUris = generatePlaylist(profileA, profileB);
  const icebreaker = generateIcebreaker(compatibility.breakdown);

  const match = await prisma.match.create({
    data: {
      userAId,
      userBId,
      compatibilityScore: compatibility.score,
      compatibilityBreakdown: { ...compatibility.breakdown, icebreaker },
      playlist: { create: { trackUris } },
    },
    include: { playlist: true },
  });

  res.json({ status: 'matched', match });
});

matchesRouter.get('/', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { playlist: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(matches);
});
