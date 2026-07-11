import { Router } from 'express';
import { prisma } from '../prisma.js';

export const adminRouter = Router();

adminRouter.use((req, res, next) => {
  const providedKey = req.header('x-admin-key');
  const expectedKey = process.env.ADMIN_KEY;
  if (!expectedKey || providedKey !== expectedKey) {
    res.status(401).json({ error: 'Non autorisé' });
    return;
  }
  next();
});

adminRouter.get('/reports', async (req, res) => {
  const status = (req.query.status as string | undefined) ?? 'pending';

  const reports = await prisma.report.findMany({
    where: status === 'all' ? {} : { status: status as 'pending' | 'dismissed' | 'action_taken' },
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, displayName: true, email: true, phone: true } },
      reported: { select: { id: true, displayName: true, email: true, phone: true, isSuspended: true } },
    },
  });

  const reportCounts = await prisma.report.groupBy({
    by: ['reportedId'],
    where: { status: { not: 'dismissed' } },
    _count: { reportedId: true },
  });
  const countByUserId = new Map(reportCounts.map((row) => [row.reportedId, row._count.reportedId]));

  res.json(
    reports.map((report) => ({
      ...report,
      reportedTotalCount: countByUserId.get(report.reportedId) ?? 0,
    }))
  );
});

adminRouter.post('/reports/:id/dismiss', async (req, res) => {
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status: 'dismissed', reviewedAt: new Date() },
  });
  res.json(report);
});

adminRouter.post('/reports/:id/action', async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) {
    res.status(404).json({ error: 'Signalement introuvable' });
    return;
  }

  await prisma.report.update({
    where: { id: report.id },
    data: { status: 'action_taken', reviewedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: report.reportedId },
    data: {
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedReason: 'Suspension suite à une revue manuelle de signalement',
    },
  });

  res.json({ status: 'ok' });
});

adminRouter.post('/users/:id/unsuspend', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isSuspended: false, suspendedAt: null, suspendedReason: null },
  });
  res.json(user);
});
