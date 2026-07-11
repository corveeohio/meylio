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

  const user = trimmedEmail
    ? await prisma.user.upsert({
        where: { email: trimmedEmail },
        create: { email: trimmedEmail },
        update: {},
        include: { musicProfile: true },
      })
    : await prisma.user.upsert({
        where: { phone: trimmedPhone! },
        create: { phone: trimmedPhone! },
        update: {},
        include: { musicProfile: true },
      });

  if (user.isSuspended) {
    res.status(403).json({
      error: 'account_suspended',
      message: user.suspendedReason ?? 'Ton compte a été suspendu suite à des signalements.',
    });
    return;
  }

  res.json(user);
});
