import { Router } from 'express';
import { prisma } from '../prisma.js';
import { sendPushNotification } from '../services/pushNotifications.js';

export const messagesRouter = Router();

messagesRouter.get('/:matchId', async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { matchId: req.params.matchId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

messagesRouter.post('/:matchId', async (req, res) => {
  const { senderId, content } = req.body as { senderId?: string; content?: string };
  if (!senderId || !content || content.trim().length === 0) {
    res.status(400).json({ error: 'senderId et content sont requis' });
    return;
  }

  const sender = await prisma.user.findUnique({ where: { id: senderId } });
  if (sender?.isSuspended) {
    res.status(403).json({ error: 'Ton compte est suspendu' });
    return;
  }

  const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });
  if (match) {
    const recipientId = match.userAId === senderId ? match.userBId : match.userAId;
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: recipientId },
          { blockerId: recipientId, blockedId: senderId },
        ],
      },
    });
    if (block) {
      res.status(403).json({ error: 'Impossible d’envoyer un message à cette personne' });
      return;
    }
  }

  const message = await prisma.message.create({
    data: { matchId: req.params.matchId, senderId, content: content.trim() },
  });

  if (match) {
    const recipientId = match.userAId === senderId ? match.userBId : match.userAId;
    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    sendPushNotification(recipient?.pushToken, sender?.email ?? 'Nouveau message', message.content, {
      type: 'message',
      matchId: match.id,
    });
  }

  res.json(message);
});
