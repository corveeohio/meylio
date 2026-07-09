import { Router } from 'express';
import { prisma } from '../prisma.js';

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

  const message = await prisma.message.create({
    data: { matchId: req.params.matchId, senderId, content: content.trim() },
  });
  res.json(message);
});
