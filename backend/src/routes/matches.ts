import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeCompatibility } from '../services/compatibility.js';
import { generateIcebreaker, generateIcebreakerQuestions, generatePlaylist } from '../services/matchGeneration.js';
import { sendPushNotification } from '../services/pushNotifications.js';

export const matchesRouter = Router();

const FREE_DAILY_LIKE_LIMIT = 5;

matchesRouter.get('/likes-remaining', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (me.subscriptionStatus === 'premium') {
    res.json({ unlimited: true, remaining: null });
    return;
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const likesToday = await prisma.like.count({
    where: { likerId: userId, createdAt: { gte: startOfDay } },
  });

  res.json({ unlimited: false, remaining: Math.max(0, FREE_DAILY_LIKE_LIMIT - likesToday) });
});

matchesRouter.delete('/like/:userId', async (req, res) => {
  const likedId = req.params.userId;
  const { userId: likerId } = req.body as { userId?: string };
  if (!likerId) {
    res.status(400).json({ error: 'userId (celui qui annule) est requis' });
    return;
  }

  const me = await prisma.user.findUnique({ where: { id: likerId } });
  if (me?.subscriptionStatus !== 'premium') {
    res.status(403).json({
      error: 'premium_required',
      message: 'Passe en Premium pour annuler ton dernier like.',
    });
    return;
  }

  const [userAId, userBId] = [likerId, likedId].sort();
  const existingMatch = await prisma.match.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (existingMatch) {
    res.status(409).json({ error: 'Impossible d’annuler, un match existe déjà' });
    return;
  }

  await prisma.like.deleteMany({ where: { likerId, likedId } });
  res.json({ status: 'undone' });
});

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
  const icebreakerQuestions = generateIcebreakerQuestions(compatibility.breakdown);

  const match = await prisma.match.create({
    data: {
      userAId,
      userBId,
      compatibilityScore: compatibility.score,
      compatibilityBreakdown: { ...compatibility.breakdown, icebreaker },
      playlist: { create: { trackUris } },
      icebreakerQuestions: {
        create: icebreakerQuestions.map((prompt, order) => ({ prompt, order })),
      },
    },
    include: { playlist: true },
  });

  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: userAId } }),
    prisma.user.findUnique({ where: { id: userBId } }),
  ]);
  sendPushNotification(userA?.pushToken, 'Nouveau match !', 'Vous avez un nouveau match musical sur Meylio.', {
    type: 'match',
    matchId: match.id,
  });
  sendPushNotification(userB?.pushToken, 'Nouveau match !', 'Vous avez un nouveau match musical sur Meylio.', {
    type: 'match',
    matchId: match.id,
  });

  res.json({ status: 'matched', match });
});

matchesRouter.get('/likes-received', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (me.subscriptionStatus !== 'premium') {
    res.status(403).json({
      error: 'premium_required',
      message: 'Passe en Premium pour voir qui t’a liké.',
    });
    return;
  }

  const myProfile = await prisma.musicProfile.findUnique({ where: { userId } });
  if (!myProfile) {
    res.status(400).json({ error: "Complète d'abord ton profil musical" });
    return;
  }

  const likesReceived = await prisma.like.findMany({
    where: { likedId: userId },
    include: { liker: { include: { musicProfile: true } } },
  });

  const myOutgoingLikes = await prisma.like.findMany({
    where: { likerId: userId },
    select: { likedId: true },
  });
  const alreadyLikedBack = new Set(myOutgoingLikes.map((like) => like.likedId));

  const pending = likesReceived
    .filter((like) => !alreadyLikedBack.has(like.likerId) && like.liker.musicProfile !== null)
    .map((like) => {
      const compatibility = computeCompatibility(myProfile, like.liker.musicProfile!);
      return { userId: like.likerId, likedAt: like.createdAt, ...compatibility };
    })
    .sort((a, b) => b.score - a.score);

  res.json(pending);
});

matchesRouter.get('/', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const [matches, blocks] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        playlist: true,
        messages: { orderBy: { createdAt: 'asc' } },
        reads: { where: { userId } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
  ]);

  const blockedUserIds = new Set(
    blocks.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId))
  );
  const visibleMatches = matches.filter((match) => {
    const otherId = match.userAId === userId ? match.userBId : match.userAId;
    return !blockedUserIds.has(otherId);
  });

  const result = visibleMatches.map((match) => {
    const { messages, reads, ...rest } = match;
    const lastReadAt = reads[0]?.lastReadAt ?? null;
    const unreadCount = messages.filter(
      (message) => message.senderId !== userId && (!lastReadAt || message.createdAt > lastReadAt)
    ).length;
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    return { ...rest, unreadCount, lastMessage };
  });

  res.json(result);
});

matchesRouter.delete('/:matchId', async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId est requis' });
    return;
  }

  const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  if (match.userAId !== userId && match.userBId !== userId) {
    res.status(403).json({ error: 'Tu ne fais pas partie de ce match' });
    return;
  }

  await prisma.match.delete({ where: { id: req.params.matchId } });

  res.json({ status: 'left' });
});

async function getPhotoRevealState(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { userA: true, userB: true },
  });
  if (!match) return null;
  if (match.userAId !== userId && match.userBId !== userId) return null;

  const isUserA = match.userAId === userId;
  const revealedByMe = isUserA ? match.photosRevealedByA : match.photosRevealedByB;
  const revealedByOther = isUserA ? match.photosRevealedByB : match.photosRevealedByA;
  const otherUser = isUserA ? match.userB : match.userA;

  return {
    match,
    isUserA,
    body: {
      revealedByMe,
      revealedByOther,
      otherPhotos: revealedByOther ? otherUser.photos : [],
    },
  };
}

matchesRouter.get('/:matchId/photos', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const state = await getPhotoRevealState(req.params.matchId, userId);
  if (!state) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  res.json(state.body);
});

matchesRouter.post('/:matchId/reveal-photos', async (req, res) => {
  const { userId, revealed } = req.body as { userId?: string; revealed?: boolean };
  if (!userId) {
    res.status(400).json({ error: 'userId est requis' });
    return;
  }

  const state = await getPhotoRevealState(req.params.matchId, userId);
  if (!state) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const nextValue = revealed ?? true;
  await prisma.match.update({
    where: { id: req.params.matchId },
    data: state.isUserA ? { photosRevealedByA: nextValue } : { photosRevealedByB: nextValue },
  });

  const updatedState = await getPhotoRevealState(req.params.matchId, userId);
  res.json(updatedState!.body);
});

matchesRouter.post('/:matchId/read', async (req, res) => {
  const matchId = req.params.matchId;
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId est requis' });
    return;
  }

  const matchRead = await prisma.matchRead.upsert({
    where: { matchId_userId: { matchId, userId } },
    create: { matchId, userId },
    update: { lastReadAt: new Date() },
  });

  res.json(matchRead);
});

matchesRouter.get('/:matchId/icebreaker', async (req, res) => {
  const matchId = req.params.matchId;
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  const otherUserId = match.userAId === userId ? match.userBId : match.userAId;

  const questions = await prisma.icebreakerQuestion.findMany({
    where: { matchId },
    orderBy: { order: 'asc' },
    include: { answers: true },
  });

  const result = questions.map((question) => {
    const mine = question.answers.find((answer) => answer.userId === userId);
    const theirs = question.answers.find((answer) => answer.userId === otherUserId);
    const bothAnswered = !!mine && !!theirs;
    return {
      id: question.id,
      prompt: question.prompt,
      order: question.order,
      myAnswer: mine?.answer ?? null,
      otherAnswer: bothAnswered ? theirs!.answer : null,
      bothAnswered,
    };
  });

  res.json(result);
});

matchesRouter.post('/:matchId/icebreaker/:questionId/answer', async (req, res) => {
  const { matchId, questionId } = req.params;
  const { userId, answer } = req.body as { userId?: string; answer?: string };
  if (!userId || !answer || !answer.trim()) {
    res.status(400).json({ error: 'userId et answer sont requis' });
    return;
  }

  const question = await prisma.icebreakerQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.matchId !== matchId) {
    res.status(404).json({ error: 'Question introuvable' });
    return;
  }

  await prisma.icebreakerAnswer.upsert({
    where: { questionId_userId: { questionId, userId } },
    create: { questionId, userId, answer: answer.trim() },
    update: { answer: answer.trim() },
  });

  res.json({ status: 'ok' });
});
