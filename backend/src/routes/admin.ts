import { Router } from 'express';
import { prisma } from '../prisma.js';
import { sendLaunchEmail } from '../services/mailer.js';

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

adminRouter.get('/waitlist/stats', async (_req, res) => {
  const [pendingEmailCount, notifiedEmailCount, verifiedPhoneCount, bySource] = await Promise.all([
    prisma.waitlistSignup.count({
      where: { email: { not: null }, verified: true, launchNotifiedAt: null },
    }),
    prisma.waitlistSignup.count({
      where: { email: { not: null }, verified: true, launchNotifiedAt: { not: null } },
    }),
    prisma.waitlistSignup.count({
      where: { phone: { not: null }, verified: true },
    }),
    prisma.waitlistSignup.groupBy({
      by: ['source'],
      where: { verified: true },
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    }),
  ]);

  res.json({
    pendingEmailCount,
    notifiedEmailCount,
    verifiedPhoneCount,
    bySource: bySource.map((row) => ({ source: row.source ?? 'direct', count: row._count._all })),
  });
});

adminRouter.post('/waitlist/notify-launch', async (_req, res) => {
  const signups = await prisma.waitlistSignup.findMany({
    where: { email: { not: null }, verified: true, launchNotifiedAt: null },
    select: { id: true, email: true },
  });

  let sent = 0;
  let failed = 0;

  for (const signup of signups) {
    try {
      await sendLaunchEmail(signup.email!);
      await prisma.waitlistSignup.update({
        where: { id: signup.id },
        data: { launchNotifiedAt: new Date() },
      });
      sent += 1;
    } catch {
      failed += 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  res.json({ sent, failed });
});
