import { Router } from 'express';
import { prisma } from '../prisma.js';

export const pageviewRouter = Router();

pageviewRouter.post('/', async (req, res) => {
  const { path, source } = req.body as { path?: string; source?: string };
  const trimmedPath = path?.trim().slice(0, 200) || '/';
  const trimmedSource = source?.trim().slice(0, 100) || undefined;

  await prisma.pageView.create({ data: { path: trimmedPath, source: trimmedSource } });
  res.status(204).end();
});
