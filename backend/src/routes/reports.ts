import { Router } from 'express';
import { prisma } from '../prisma.js';

export const reportsRouter = Router();

const AUTO_SUSPEND_THRESHOLD = 3;

reportsRouter.post('/', async (req, res) => {
  const { reporterId, reportedId, reason } = req.body as {
    reporterId?: string;
    reportedId?: string;
    reason?: string;
  };

  if (!reporterId || !reportedId || !reason) {
    res.status(400).json({ error: 'reporterId, reportedId et reason sont requis' });
    return;
  }
  if (reporterId === reportedId) {
    res.status(400).json({ error: 'Impossible de se signaler soi-même' });
    return;
  }

  const report = await prisma.report.create({
    data: { reporterId, reportedId, reason },
  });

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: reporterId, blockedId: reportedId } },
    create: { blockerId: reporterId, blockedId: reportedId },
    update: {},
  });

  const distinctReporters = await prisma.report.findMany({
    where: { reportedId, status: { not: 'dismissed' } },
    distinct: ['reporterId'],
    select: { reporterId: true },
  });

  if (distinctReporters.length >= AUTO_SUSPEND_THRESHOLD) {
    const target = await prisma.user.findUnique({ where: { id: reportedId } });
    if (target && !target.isSuspended) {
      await prisma.user.update({
        where: { id: reportedId },
        data: {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedReason: `Suspension automatique : ${distinctReporters.length} signalements distincts en attente de revue`,
        },
      });
    }
  }

  res.json(report);
});
