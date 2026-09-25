import { Router } from 'express';
import { prisma } from '../prisma.js';
import { isValidUnsubscribeSignature, type UnsubscribeKind } from '../services/notificationPrefs.js';

export const unsubscribeRouter = Router();

const page = (message: string) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meylio</title></head><body style="font-family:-apple-system,sans-serif;background:#0F0F14;color:#fff;text-align:center;padding:60px 24px"><h1>Meylio</h1><p style="color:#9A9AA8">${message}</p></body></html>`;

unsubscribeRouter.get('/', async (req, res) => {
  const userId = String(req.query.u ?? '');
  const kind = String(req.query.k ?? '') as UnsubscribeKind;
  const signature = String(req.query.s ?? '');

  if (!userId || (kind !== 'likes' && kind !== 'marketing') || !isValidUnsubscribeSignature(userId, kind, signature)) {
    res.status(400).send(page('Lien invalide ou expiré.'));
    return;
  }

  await prisma.user.updateMany({
    where: { id: userId },
    data: kind === 'likes' ? { notifyLikeAlerts: false } : { marketingOptIn: false },
  });
  res.send(page(kind === 'likes' ? 'Tu ne recevras plus les alertes de likes.' : 'Tu ne recevras plus nos actualités.'));
});
