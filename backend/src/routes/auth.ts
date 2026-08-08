import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../prisma.js';
import { sendLoginCodeEmail } from '../services/mailer.js';
import { sendLoginCodeSms } from '../services/sms.js';

export const authRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 30;
const EARLY_ADOPTER_PREMIUM_SPOTS = 300;
const EARLY_ADOPTER_PREMIUM_MONTHS = 3;

// Meylio's login is passwordless (email/SMS code), which Apple reviewers can't
// receive. This fixed account lets App Review sign in without a real inbox/phone.
const APPLE_REVIEW_EMAIL = 'apple-review@meylio.fr';
const APPLE_REVIEW_CODE = '482913';

async function getEarlyAdopterPremiumGrant() {
  const existingUserCount = await prisma.user.count();
  if (existingUserCount >= EARLY_ADOPTER_PREMIUM_SPOTS) return null;

  const premiumUntil = new Date();
  premiumUntil.setMonth(premiumUntil.getMonth() + EARLY_ADOPTER_PREMIUM_MONTHS);
  return { subscriptionStatus: 'premium' as const, premiumUntil };
}

authRouter.post('/request-code', async (req, res) => {
  const { email, phone } = req.body as { email?: string; phone?: string };
  const trimmedEmail = email?.trim() || undefined;
  const trimmedPhone = phone?.trim() || undefined;

  if (!trimmedEmail && !trimmedPhone) {
    res.status(400).json({ error: 'Adresse email ou numéro de téléphone requis' });
    return;
  }
  if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
    res.status(400).json({ error: 'Adresse email invalide' });
    return;
  }
  if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
    res.status(400).json({ error: 'Numéro de téléphone invalide' });
    return;
  }

  if (trimmedEmail === APPLE_REVIEW_EMAIL) {
    res.json({ message: 'Code envoyé' });
    return;
  }

  const recentCode = await prisma.loginCode.findFirst({
    where: {
      ...(trimmedEmail ? { email: trimmedEmail } : { phone: trimmedPhone }),
      createdAt: { gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recentCode) {
    res.status(429).json({ error: 'Patiente quelques secondes avant de redemander un code' });
    return;
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.loginCode.create({
    data: { email: trimmedEmail ?? null, phone: trimmedPhone ?? null, code, expiresAt },
  });

  if (trimmedEmail) {
    await sendLoginCodeEmail(trimmedEmail, code);
  } else {
    await sendLoginCodeSms(trimmedPhone!, code);
  }

  res.json({ message: 'Code envoyé' });
});

authRouter.post('/verify-code', async (req, res) => {
  const { email, phone, code } = req.body as { email?: string; phone?: string; code?: string };
  const trimmedEmail = email?.trim() || undefined;
  const trimmedPhone = phone?.trim() || undefined;

  if (!code || (!trimmedEmail && !trimmedPhone)) {
    res.status(400).json({ error: 'code et (email ou téléphone) sont requis' });
    return;
  }

  const isAppleReview = trimmedEmail === APPLE_REVIEW_EMAIL && code === APPLE_REVIEW_CODE;

  if (!isAppleReview) {
    const loginCode = await prisma.loginCode.findFirst({
      where: {
        ...(trimmedEmail ? { email: trimmedEmail } : { phone: trimmedPhone }),
        code,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!loginCode) {
      res.status(400).json({ error: 'Code invalide ou expiré' });
      return;
    }

    await prisma.loginCode.update({ where: { id: loginCode.id }, data: { usedAt: new Date() } });
  }

  let user = await prisma.user.findUnique({
    where: trimmedEmail ? { email: trimmedEmail } : { phone: trimmedPhone! },
    include: { musicProfile: true },
  });

  if (!user) {
    const premiumGrant = isAppleReview ? null : await getEarlyAdopterPremiumGrant();
    user = await prisma.user.create({
      data: {
        ...(trimmedEmail ? { email: trimmedEmail } : { phone: trimmedPhone! }),
        ...premiumGrant,
      },
      include: { musicProfile: true },
    });
  }

  if (user.isSuspended) {
    res.status(403).json({
      error: 'account_suspended',
      message: user.suspendedReason ?? 'Ton compte a été suspendu suite à des signalements.',
    });
    return;
  }

  res.json(user);
});
