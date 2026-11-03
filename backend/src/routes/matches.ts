import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeCompatibility } from '../services/compatibility.js';
import {
  generateIcebreaker,
  generateIcebreakerQuestions,
  generatePlaylist,
  resolvePlaylistPlaceholders,
  toPlaylistTracks,
} from '../services/matchGeneration.js';
import { sendPushNotification } from '../services/pushNotifications.js';
import { notifyLikeReceived } from '../services/likeAlerts.js';
import { getIcebreakerStatus } from '../services/icebreakerGate.js';
import { isPremiumActive } from '../utils/subscription.js';
import { hasUsableMusicProfile, isDiscoverable } from '../services/profileVisibility.js';

export const matchesRouter = Router();

const FREE_TOTAL_LIKE_LIMIT = 25;

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

  if (isPremiumActive(me)) {
    res.json({ unlimited: true, remaining: null });
    return;
  }

  const likesGiven = await prisma.like.count({ where: { likerId: userId } });

  res.json({ unlimited: false, remaining: Math.max(0, FREE_TOTAL_LIKE_LIMIT - likesGiven) });
});

matchesRouter.delete('/like/:userId', async (req, res) => {
  const likedId = req.params.userId;
  const { userId: likerId } = req.body as { userId?: string };
  if (!likerId) {
    res.status(400).json({ error: 'userId (celui qui annule) est requis' });
    return;
  }

  const me = await prisma.user.findUnique({ where: { id: likerId } });
  if (!me || !isPremiumActive(me)) {
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

matchesRouter.post('/pass/:userId', async (req, res) => {
  const passedId = req.params.userId;
  const { userId: passerId } = req.body as { userId?: string };
  if (!passerId || passerId === passedId) {
    res.status(400).json({ error: 'userId est requis' });
    return;
  }
  await prisma.pass.upsert({
    where: { passerId_passedId: { passerId, passedId } },
    create: { passerId, passedId },
    update: {},
  });
  res.json({ status: 'passed' });
});

matchesRouter.delete('/pass/:userId', async (req, res) => {
  const passedId = req.params.userId;
  const { userId: passerId } = req.body as { userId?: string };
  if (!passerId) {
    res.status(400).json({ error: 'userId est requis' });
    return;
  }
  const me = await prisma.user.findUnique({ where: { id: passerId } });
  if (!me || !isPremiumActive(me)) {
    res.status(403).json({
      error: 'premium_required',
      message: 'Passe en Premium pour revenir en arrière sur un profil.',
    });
    return;
  }
  await prisma.pass.deleteMany({ where: { passerId, passedId } });
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

  const liker = await prisma.user.findUnique({ where: { id: likerId } });
  if (liker?.isSuspended) {
    res.status(403).json({ error: 'Ton compte est suspendu' });
    return;
  }

  const existingLike = await prisma.like.findUnique({
    where: { likerId_likedId: { likerId, likedId } },
  });

  if (!existingLike) {
    if (!liker || !isPremiumActive(liker)) {
      const likesGiven = await prisma.like.count({ where: { likerId } });
      if (likesGiven >= FREE_TOTAL_LIKE_LIMIT) {
        res.status(403).json({
          error: 'daily_limit_reached',
          message: `Tu as utilisé tes ${FREE_TOTAL_LIKE_LIMIT} likes gratuits. Passe en Premium pour liker sans limite.`,
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
    void notifyLikeReceived(likedId);
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
  const trackUris = await generatePlaylist(profileA, profileB, compatibility.breakdown);
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

// Likes still waiting for an answer: not liked back, not passed, from visible profiles.
async function getPendingLikes(userId: string) {
  const [likesReceived, myOutgoingLikes, myPasses, blocks] = await Promise.all([
    prisma.like.findMany({ where: { likedId: userId }, include: { liker: { include: { musicProfile: true } } } }),
    prisma.like.findMany({ where: { likerId: userId }, select: { likedId: true } }),
    prisma.pass.findMany({ where: { passerId: userId }, select: { passedId: true } }),
    prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
  ]);
  const answered = new Set([...myOutgoingLikes.map((like) => like.likedId), ...myPasses.map((pass) => pass.passedId)]);
  const blockedIds = new Set(blocks.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId)));
  return likesReceived.filter(
    (like) => !answered.has(like.likerId) && !blockedIds.has(like.likerId) && isDiscoverable(like.liker)
  );
}

// Free accounts get the count too: seeing "3 likes" is what makes the Premium list worth it.
matchesRouter.get('/likes-count', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }
  res.json({ count: (await getPendingLikes(userId)).length });
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
  if (!isPremiumActive(me)) {
    res.status(403).json({
      error: 'premium_required',
      message: 'Passe en Premium pour voir qui t’a liké.',
    });
    return;
  }

  const myProfile = await prisma.musicProfile.findUnique({ where: { userId } });
  if (!hasUsableMusicProfile(myProfile)) {
    res.status(400).json({ error: 'empty_music_profile', message: "Complète d'abord ton profil musical" });
    return;
  }

  const pending = (await getPendingLikes(userId))
    .map((like) => {
      const compatibility = computeCompatibility(myProfile, like.liker.musicProfile!);
      return {
        userId: like.likerId,
        displayName: like.liker.displayName,
        age: like.liker.age,
        isVerified: like.liker.isVerified,
        likedAt: like.createdAt,
        ...compatibility,
      };
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
        userA: { select: { displayName: true, age: true, isVerified: true } },
        userB: { select: { displayName: true, age: true, isVerified: true } },
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

  const result = visibleMatches
    .map((match) => {
      const { messages, reads, userA, userB, ...rest } = match;
      const lastReadAt = reads[0]?.lastReadAt ?? null;
      const unreadCount = messages.filter(
        (message) => message.senderId !== userId && (!lastReadAt || message.createdAt > lastReadAt)
      ).length;
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const otherUser = match.userAId === userId ? userB : userA;
      return { ...rest, otherUser, unreadCount, lastMessage };
    })
    // Most recent conversation first, like any messaging app; new matches count from their creation.
    .sort(
      (a, b) =>
        (b.lastMessage?.createdAt ?? b.createdAt).getTime() - (a.lastMessage?.createdAt ?? a.createdAt).getTime()
    );

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

matchesRouter.get('/:matchId/playlist', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }

  const match = await prisma.match.findUnique({ where: { id: req.params.matchId }, include: { playlist: true } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  let trackUris = match.playlist?.trackUris ?? [];
  const resolved = await resolvePlaylistPlaceholders(trackUris);
  if (match.playlist && resolved !== trackUris) {
    await prisma.playlist.update({ where: { id: match.playlist.id }, data: { trackUris: resolved } });
    trackUris = resolved;
  }

  // Links open in the service the viewer actually uses.
  const myProfile = await prisma.musicProfile.findUnique({ where: { userId }, select: { source: true } });
  res.json({
    preferredService: myProfile?.source === 'spotify' ? 'spotify' : 'apple_music',
    tracks: toPlaylistTracks(trackUris),
  });
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

matchesRouter.get('/:matchId/icebreaker-status', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId est requis en query param' });
    return;
  }
  const status = await getIcebreakerStatus(req.params.matchId, userId);
  if (!status) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  res.json(status);
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
