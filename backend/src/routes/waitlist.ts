import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { sendWaitlistVerificationEmail } from '../services/mailer.js';

export const waitlistRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

waitlistRouter.post('/', async (req, res) => {
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

  try {
    if (trimmedEmail) {
      const verificationToken = randomUUID();
      await prisma.waitlistSignup.create({ data: { email: trimmedEmail, verificationToken } });
      await sendWaitlistVerificationEmail(trimmedEmail, verificationToken);
      res.json({ message: 'Vérifie ta boîte mail pour confirmer ton inscription' });
      return;
    }

    await prisma.waitlistSignup.create({ data: { phone: trimmedPhone, verified: true } });
    res.json({ message: 'Tu es sur la liste d’attente !' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.json({ message: 'Déjà inscrit' });
      return;
    }
    throw error;
  }
});

waitlistRouter.post('/resend', async (req, res) => {
  const { email } = req.body as { email?: string };
  const signup = email ? await prisma.waitlistSignup.findUnique({ where: { email } }) : null;

  if (!signup) {
    res.status(404).json({ error: 'Adresse introuvable dans la liste d’attente' });
    return;
  }
  if (signup.verified) {
    res.json({ message: 'Déjà vérifié' });
    return;
  }
  if (!signup.email || !signup.verificationToken) {
    res.status(400).json({ error: 'Ce compte utilise un numéro de téléphone, pas un email' });
    return;
  }

  await sendWaitlistVerificationEmail(signup.email, signup.verificationToken);
  res.json({ message: 'Email de vérification renvoyé' });
});

waitlistRouter.get('/verify', async (req, res) => {
  const token = req.query.token as string | undefined;
  const signup = token ? await prisma.waitlistSignup.findUnique({ where: { verificationToken: token } }) : null;

  if (!signup) {
    res.status(400).send(renderVerifyPage(false));
    return;
  }

  if (!signup.verified) {
    await prisma.waitlistSignup.update({ where: { id: signup.id }, data: { verified: true } });
  }

  res.send(renderVerifyPage(true));
});

function renderVerifyPage(success: boolean): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Meylio</title>
      <style>
        body { margin: 0; background: #0F0F14; color: #FFFFFF; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
        .card { max-width: 420px; padding: 24px; }
        h1 { font-size: 24px; margin-bottom: 12px; }
        p { color: #9A9AA8; font-size: 15px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${success ? 'Adresse confirmée ✓' : 'Lien invalide'}</h1>
        <p>${
          success
            ? 'Ton inscription à la liste d\'attente Meylio est validée. On te préviendra dès le lancement.'
            : 'Ce lien de vérification est invalide ou a déjà été utilisé.'
        }</p>
      </div>
    </body>
    </html>
  `;
}
