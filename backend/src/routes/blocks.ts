import { Router } from 'express';
import { prisma } from '../prisma.js';

export const blocksRouter = Router();

blocksRouter.post('/', async (req, res) => {
  const { blockerId, blockedId } = req.body as { blockerId?: string; blockedId?: string };
  if (!blockerId || !blockedId) {
    res.status(400).json({ error: 'blockerId et blockedId sont requis' });
    return;
  }
  if (blockerId === blockedId) {
    res.status(400).json({ error: 'Impossible de se bloquer soi-même' });
    return;
  }

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });

  res.json({ status: 'blocked' });
});
