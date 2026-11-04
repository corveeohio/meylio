import { Router } from 'express';
import { prisma } from '../prisma.js';
import { sendFeedbackEmail } from '../services/mailer.js';

export const feedbackRouter = Router();

const MAX_MESSAGE_LENGTH = 2000;

feedbackRouter.post('/', async (req, res) => {
  const { userId, rating, message, appVersion } = req.body as {
    userId?: string;
    rating?: number;
    message?: string;
    appVersion?: string;
  };
  const text = message?.trim() ?? '';
  if (text.length === 0) {
    res.status(400).json({ error: 'Écris quelques mots avant d’envoyer ton avis.' });
    return;
  }
  const validRating = Number.isInteger(rating) && rating! >= 1 && rating! <= 5 ? rating! : null;

  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const feedback = await prisma.feedback.create({
    data: {
      userId: user?.id ?? null,
      rating: validRating,
      message: text.slice(0, MAX_MESSAGE_LENGTH),
      appVersion: appVersion?.slice(0, 20) ?? null,
    },
  });

  sendFeedbackEmail({
    pseudo: user?.displayName ?? null,
    rating: validRating,
    message: feedback.message,
    appVersion: feedback.appVersion,
  }).catch((error) => console.error('[Feedback] Échec de l’email :', error));

  res.json({ ok: true });
});
