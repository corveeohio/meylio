import { Router } from 'express';
import { prisma } from '../prisma.js';

export const reportsRouter = Router();

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

  res.json(report);
});
