import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma.js';

export const usersRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'));
  },
});

usersRouter.post('/bootstrap', async (_req, res) => {
  const user = await prisma.user.create({
    data: { email: `demo-${randomUUID()}@meylio.local` },
  });
  res.json(user);
});

usersRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { musicProfile: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

usersRouter.patch('/:id', async (req, res) => {
  const { locationOptIn } = req.body as { locationOptIn?: boolean };
  const userId = String(req.params.id);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { ...(locationOptIn !== undefined && { locationOptIn }) },
  });

  res.json(updated);
});

usersRouter.patch('/:id/location', async (req, res) => {
  const { latitude, longitude } = req.body as { latitude?: number; longitude?: number };
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ error: 'latitude et longitude sont requis' });
    return;
  }

  const userId = String(req.params.id);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { lastLatitude: latitude, lastLongitude: longitude, lastLocationAt: new Date() },
  });

  res.json(updated);
});

usersRouter.post('/:id/upgrade', async (req, res) => {
  const userId = String(req.params.id);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: 'premium' },
  });
  res.json(updated);
});

usersRouter.post('/:id/photos', upload.array('photos', 6), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'Au moins une photo est requise' });
    return;
  }

  const newPhotoUrls = files.map((file) => `/uploads/${file.filename}`);
  const userId = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { photos: [...user.photos, ...newPhotoUrls] },
  });

  res.json(updated);
});

usersRouter.post('/:id/selfie', upload.single('selfie'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Une photo de selfie est requise' });
    return;
  }

  const userId = String(req.params.id);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { selfieUrl: `/uploads/${file.filename}`, isVerified: true },
  });

  res.json(updated);
});
