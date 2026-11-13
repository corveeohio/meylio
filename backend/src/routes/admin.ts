import { Router } from 'express';
import { prisma } from '../prisma.js';
import { sendFeedbackReplyEmail, sendLaunchEmail, sendMarketingEmail } from '../services/mailer.js';
import { sendFeedbackReplySms, sendLaunchSms, sendMarketingSms } from '../services/sms.js';
import { buildUnsubscribeUrl } from '../services/notificationPrefs.js';

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

adminRouter.get('/events', async (_req, res) => {
  const events = await prisma.event.findMany({
    orderBy: { startAt: 'desc' },
    include: { _count: { select: { participants: true } } },
  });
  res.json(events);
});

adminRouter.post('/events', async (req, res) => {
  const { type, title, artistName, startAt, endAt, latitude, longitude, radiusKm } = req.body as {
    type?: 'album_release' | 'festival';
    title?: string;
    artistName?: string;
    startAt?: string;
    endAt?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  };

  if (!type || !title || !startAt || !endAt) {
    res.status(400).json({ error: 'type, title, startAt et endAt sont requis' });
    return;
  }

  const event = await prisma.event.create({
    data: {
      type,
      title,
      artistName: artistName ?? null,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      radiusKm: radiusKm ?? null,
    },
  });
  res.json(event);
});

adminRouter.delete('/events/:id', async (req, res) => {
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ status: 'deleted' });
});

// "Donner mon avis" messages, with the author's contact so the team can answer them.
adminRouter.get('/feedback', async (_req, res) => {
  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, displayName: true, email: true, phone: true } } },
  });
  res.json(feedbacks);
});

const MAX_FEEDBACK_REPLY_LENGTH = 300;

// Answers from Meylio's own SMS sender (Octopush), or by email when the account has no phone.
adminRouter.post('/feedback/:id/reply', async (req, res) => {
  const message = (req.body as { message?: string }).message?.trim() ?? '';
  if (message.length === 0 || message.length > MAX_FEEDBACK_REPLY_LENGTH) {
    res.status(400).json({ error: `Écris une réponse de ${MAX_FEEDBACK_REPLY_LENGTH} caractères maximum.` });
    return;
  }
  const feedback = await prisma.feedback.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { email: true, phone: true } } },
  });
  if (!feedback) {
    res.status(404).json({ error: 'Avis introuvable.' });
    return;
  }
  if (feedback.repliedAt) {
    res.status(409).json({ error: 'Tu as déjà répondu à cet avis.' });
    return;
  }
  const phone = feedback.user?.phone;
  const email = feedback.user?.email;
  if (!phone && !email) {
    res.status(400).json({ error: 'Aucun contact sur ce compte.' });
    return;
  }

  try {
    if (phone) await sendFeedbackReplySms(phone, message);
    else await sendFeedbackReplyEmail(email!, message);
  } catch {
    res.status(502).json({ error: 'L’envoi a échoué, réessaie dans un instant.' });
    return;
  }

  const updated = await prisma.feedback.update({
    where: { id: feedback.id },
    data: { replyMessage: message, repliedAt: new Date() },
  });
  res.json({ channel: phone ? 'sms' : 'email', replyMessage: updated.replyMessage, repliedAt: updated.repliedAt });
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

const DAY_MS = 24 * 60 * 60 * 1000;
const parisDay = (date: Date) => date.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });

// Accounts created in the app: growth, how far people get in onboarding, and activity.
adminRouter.get('/users/stats', async (_req, res) => {
  const now = Date.now();
  const since = (days: number) => new Date(now - days * DAY_MS);
  const users = await prisma.user.findMany({
    where: { OR: [{ email: null }, { email: { not: 'apple-review@meylio.fr' } }] },
    select: {
      createdAt: true,
      termsAcceptedAt: true,
      displayName: true,
      age: true,
      photos: true,
      isVerified: true,
      selfieUrl: true,
      isSuspended: true,
      lastActiveAt: true,
      subscriptionStatus: true,
      premiumUntil: true,
      musicProfile: { select: { source: true, topArtists: true, topGenres: true } },
    },
  });
  const [likes7d, matches7d, messages7d, matchesTotal] = await Promise.all([
    prisma.like.count({ where: { createdAt: { gte: since(7) } } }),
    prisma.match.count({ where: { createdAt: { gte: since(7) } } }),
    prisma.message.count({ where: { createdAt: { gte: since(7) } } }),
    prisma.match.count(),
  ]);

  const createdBetween = (fromDays: number, toDays: number) =>
    users.filter((user) => user.createdAt >= since(fromDays) && user.createdAt < since(toDays)).length;
  const hasMusic = (user: (typeof users)[number]) =>
    !!user.musicProfile && (user.musicProfile.topArtists.length > 0 || user.musicProfile.topGenres.length > 0);

  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) byDay.set(parisDay(since(i)), 0);
  for (const user of users) {
    const day = parisDay(user.createdAt);
    if (byDay.has(day)) byDay.set(day, byDay.get(day)! + 1);
  }

  res.json({
    total: users.length,
    last7d: createdBetween(7, 0),
    previous7d: createdBetween(14, 7),
    last30d: createdBetween(30, 0),
    active7d: users.filter((user) => user.lastActiveAt && user.lastActiveAt >= since(7)).length,
    active30d: users.filter((user) => user.lastActiveAt && user.lastActiveAt >= since(30)).length,
    funnel: [
      { step: 'Compte créé', count: users.length },
      { step: 'Conditions acceptées', count: users.filter((user) => user.termsAcceptedAt).length },
      { step: 'Pseudo choisi', count: users.filter((user) => user.displayName).length },
      { step: 'Profil musical', count: users.filter((user) => user.musicProfile).length },
      { step: 'Photos ajoutées', count: users.filter((user) => user.photos.length > 0).length },
      {
        step: 'Profil complet',
        count: users.filter((user) => user.displayName && user.age && user.photos.length > 0 && user.musicProfile).length,
      },
    ],
    music: [
      { source: 'Apple Music', count: users.filter((user) => user.musicProfile?.source === 'apple_music').length },
      { source: 'Spotify', count: users.filter((user) => user.musicProfile?.source === 'spotify').length },
      { source: 'Saisie manuelle', count: users.filter((user) => user.musicProfile?.source === 'manual').length },
      { source: 'Aucun profil', count: users.filter((user) => !user.musicProfile).length },
      { source: 'Profil sans goûts', count: users.filter((user) => user.musicProfile && !hasMusic(user)).length },
    ],
    verified: users.filter((user) => user.isVerified).length,
    premium: users.filter(
      (user) => user.subscriptionStatus === 'premium' && (!user.premiumUntil || user.premiumUntil.getTime() > now)
    ).length,
    suspended: users.filter((user) => user.isSuspended).length,
    engagement7d: { likes: likes7d, matches: matches7d, messages: messages7d, matchesTotal },
    byDay: [...byDay.entries()].map(([day, count]) => ({ day, count })),
  });
});

adminRouter.get('/waitlist/stats', async (_req, res) => {
  const [
    pendingEmailCount,
    notifiedEmailCount,
    pendingPhoneCount,
    notifiedPhoneCount,
    unverifiedEmailCount,
    unverifiedPhoneCount,
    bySource,
  ] = await Promise.all([
    prisma.waitlistSignup.count({
      where: { email: { not: null }, verified: true, launchNotifiedAt: null },
    }),
    prisma.waitlistSignup.count({
      where: { email: { not: null }, verified: true, launchNotifiedAt: { not: null } },
    }),
    prisma.waitlistSignup.count({
      where: { phone: { not: null }, verified: true, launchNotifiedAt: null },
    }),
    prisma.waitlistSignup.count({
      where: { phone: { not: null }, verified: true, launchNotifiedAt: { not: null } },
    }),
    prisma.waitlistSignup.count({
      where: { email: { not: null }, verified: false },
    }),
    prisma.waitlistSignup.count({
      where: { phone: { not: null }, verified: false },
    }),
    prisma.waitlistSignup.groupBy({
      by: ['source'],
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    }),
  ]);

  res.json({
    pendingEmailCount,
    notifiedEmailCount,
    pendingPhoneCount,
    notifiedPhoneCount,
    unverifiedEmailCount,
    unverifiedPhoneCount,
    bySource: bySource.map((row) => ({ source: row.source ?? 'direct', count: row._count._all })),
  });
});

adminRouter.get('/pageviews/stats', async (_req, res) => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, last24h, last7d, bySource] = await Promise.all([
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: since24h } } }),
    prisma.pageView.count({ where: { createdAt: { gte: since7d } } }),
    prisma.pageView.groupBy({
      by: ['source'],
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    }),
  ]);

  res.json({
    total,
    last24h,
    last7d,
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

adminRouter.post('/waitlist/notify-launch-sms', async (_req, res) => {
  const signups = await prisma.waitlistSignup.findMany({
    where: { phone: { not: null }, verified: true, launchNotifiedAt: null },
    select: { id: true, phone: true },
  });

  let sent = 0;
  let failed = 0;

  for (const signup of signups) {
    try {
      await sendLaunchSms(signup.phone!);
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

adminRouter.get('/marketing/audience', async (_req, res) => {
  const [total, emailCount, smsCount] = await Promise.all([
    prisma.user.count({ where: { marketingOptIn: true, isSuspended: false } }),
    prisma.user.count({ where: { marketingOptIn: true, isSuspended: false, email: { not: null } } }),
    prisma.user.count({ where: { marketingOptIn: true, isSuspended: false, phone: { not: null } } }),
  ]);
  res.json({ optedIn: total, withEmail: emailCount, withPhone: smsCount });
});

adminRouter.post('/marketing/send', async (req, res) => {
  const { channel, subject, message } = req.body as { channel?: 'email' | 'sms'; subject?: string; message?: string };
  if ((channel !== 'email' && channel !== 'sms') || !message || message.trim().length < 5) {
    res.status(400).json({ error: 'channel (email|sms) et message sont requis' });
    return;
  }
  if (channel === 'email' && (!subject || subject.trim().length < 3)) {
    res.status(400).json({ error: 'Un objet est requis pour un email' });
    return;
  }
  if (channel === 'sms' && message.length > 120) {
    res.status(400).json({ error: 'SMS limité à 120 caractères (le lien de désinscription est ajouté)' });
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      marketingOptIn: true,
      isSuspended: false,
      ...(channel === 'email' ? { email: { not: null } } : { phone: { not: null } }),
    },
    select: { id: true, email: true, phone: true },
  });

  let sent = 0;
  let failed = 0;
  for (const user of users) {
    try {
      const unsubscribeUrl = buildUnsubscribeUrl(user.id, 'marketing');
      if (channel === 'email') await sendMarketingEmail(user.email!, subject!.trim(), message.trim(), unsubscribeUrl);
      else await sendMarketingSms(user.phone!, message.trim(), unsubscribeUrl);
      sent += 1;
    } catch {
      failed += 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  res.json({ sent, failed });
});
