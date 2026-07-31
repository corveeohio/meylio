import { Router } from 'express';
import { prisma } from '../prisma.js';

export const subscriptionsRouter = Router();

const GRANTS_PREMIUM = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'TRANSFER',
]);

subscriptionsRouter.post('/webhook/revenuecat', async (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (expectedSecret && authHeader !== expectedSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const event = req.body?.event as
    | { type?: string; app_user_id?: string; expiration_at_ms?: number | null }
    | undefined;

  if (!event?.app_user_id || !event.type) {
    res.status(400).json({ error: 'Payload invalide' });
    return;
  }

  const userId = event.app_user_id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(200).json({ ignored: true });
    return;
  }

  if (GRANTS_PREMIUM.has(event.type)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'premium',
        premiumUntil: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
      },
    });
  } else if (event.type === 'EXPIRATION') {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'free', premiumUntil: null },
    });
  }

  res.status(200).json({ received: true });
});
