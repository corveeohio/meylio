import { randomInt, randomUUID } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma.js';
import { sendLoginCodeEmail } from '../services/mailer.js';
import { sendLoginCodeSms } from '../services/sms.js';
import { detectNewCrossings } from '../services/crossingAlerts.js';
import { compareFaces, imageContainsFace } from '../services/faceRecognition.js';
import { haversineDistanceKm } from '../services/geo.js';
import { computeCuratorBadge } from '../services/curator.js';
import { deletePhoto, getPhotoBuffer, photoKeyFromUrl, uploadPhoto } from '../services/s3.js';

export const usersRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 30;

// Photos are held in memory just long enough to validate + upload to S3;
// Railway's own disk is ephemeral so nothing is ever written to it.
const upload = multer({
  storage: multer.memoryStorage(),
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

usersRouter.get('/check-display-name', async (req, res) => {
  const name = String(req.query.name ?? '').trim();
  if (name.length < 2) {
    res.json({ available: false });
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { displayName: { equals: name, mode: 'insensitive' } },
  });
  res.json({ available: !existing });
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

  const relativeToUserId = req.query.relativeToUserId as string | undefined;
  let distanceKm: number | null = null;
  if (relativeToUserId && relativeToUserId !== user.id) {
    const relativeTo = await prisma.user.findUnique({ where: { id: relativeToUserId } });
    if (
      relativeTo?.lastLatitude != null &&
      relativeTo?.lastLongitude != null &&
      user.lastLatitude != null &&
      user.lastLongitude != null
    ) {
      distanceKm =
        Math.round(
          haversineDistanceKm(relativeTo.lastLatitude, relativeTo.lastLongitude, user.lastLatitude, user.lastLongitude) *
            10
        ) / 10;
    }
  }

  const { isCurator, discoveredArtist } = await computeCuratorBadge(user.id, user.musicProfile?.topArtists ?? []);

  res.json({ ...user, distanceKm, isCurator, discoveredArtist });
});

usersRouter.patch('/:id', async (req, res) => {
  const {
    locationOptIn,
    age,
    displayName,
    gender,
    city,
    genderPreference,
    relationshipIntent,
    minAgePreference,
    maxAgePreference,
    maxDistanceKm,
  } = req.body as {
    locationOptIn?: boolean;
    age?: number;
    displayName?: string;
    gender?: string;
    city?: string;
    genderPreference?: string[];
    relationshipIntent?: string;
    minAgePreference?: number;
    maxAgePreference?: number;
    maxDistanceKm?: number;
  };
  const userId = String(req.params.id);

  let trimmedDisplayName: string | undefined;
  if (displayName !== undefined) {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (current.displayName) {
      res.status(403).json({ error: 'Le pseudo ne peut plus être modifié' });
      return;
    }
    trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length < 2) {
      res.status(400).json({ error: 'Le pseudo doit contenir au moins 2 caractères' });
      return;
    }
    const taken = await prisma.user.findFirst({
      where: { displayName: { equals: trimmedDisplayName, mode: 'insensitive' }, NOT: { id: userId } },
    });
    if (taken) {
      res.status(409).json({ error: 'Ce pseudo est déjà pris' });
      return;
    }
  }

  if (age !== undefined) {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (current.age !== null) {
      res.status(403).json({ error: "L'âge ne peut plus être modifié après la création du profil" });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(locationOptIn !== undefined && { locationOptIn }),
      ...(age !== undefined && { age }),
      ...(trimmedDisplayName !== undefined && { displayName: trimmedDisplayName }),
      ...(gender !== undefined && { gender: gender || null }),
      ...(city !== undefined && { city: city || null }),
      ...(genderPreference !== undefined && { genderPreference }),
      ...(relationshipIntent !== undefined && { relationshipIntent: relationshipIntent || null }),
      ...(minAgePreference !== undefined && { minAgePreference }),
      ...(maxAgePreference !== undefined && { maxAgePreference }),
      ...(maxDistanceKm !== undefined && { maxDistanceKm }),
    },
  });

  res.json(updated);
});

usersRouter.post('/:id/accept-terms', async (req, res) => {
  const userId = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { termsAcceptedAt: user.termsAcceptedAt ?? new Date() },
  });
  res.json(updated);
});

usersRouter.post('/:id/heartbeat', async (req, res) => {
  const userId = String(req.params.id);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  });
  res.json({ lastActiveAt: updated.lastActiveAt });
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
  await prisma.locationPing.create({ data: { userId, latitude, longitude } });

  detectNewCrossings(userId).catch((error) => console.error('[crossing] Échec de détection :', error));

  res.json(updated);
});

usersRouter.post('/:id/push-token', async (req, res) => {
  const { pushToken } = req.body as { pushToken?: string };
  if (!pushToken) {
    res.status(400).json({ error: 'pushToken est requis' });
    return;
  }

  const userId = String(req.params.id);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { pushToken },
  });

  res.json(updated);
});

usersRouter.post('/:id/photos', upload.array('photos', 6), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'Au moins une photo est requise' });
    return;
  }

  const userId = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const referenceRelativePath = user.selfieUrl ?? user.photos[0] ?? null;
  const referenceBytes = referenceRelativePath ? await getPhotoBuffer(photoKeyFromUrl(referenceRelativePath)) : null;

  for (const file of files) {
    const hasFace = await imageContainsFace(file.buffer);
    if (!hasFace) {
      res.status(400).json({
        error: `Aucun visage détecté sur "${file.originalname}". Les photos de profil doivent montrer ton visage.`,
      });
      return;
    }
    if (referenceBytes) {
      const comparison = await compareFaces(file.buffer, referenceBytes);
      if (!comparison.matched) {
        res.status(400).json({
          error: `"${file.originalname}" ne semble pas être toi. Les photos de profil doivent toutes te représenter.`,
        });
        return;
      }
    }
  }

  const newPhotoUrls: string[] = [];
  for (const file of files) {
    const key = `${randomUUID()}${path.extname(file.originalname)}`;
    await uploadPhoto(key, file.buffer, file.mimetype);
    newPhotoUrls.push(`/uploads/${key}`);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { photos: [...user.photos, ...newPhotoUrls] },
  });

  res.json(updated);
});

usersRouter.delete('/:id/photos', async (req, res) => {
  const { photoUrl } = req.body as { photoUrl?: string };
  if (!photoUrl) {
    res.status(400).json({ error: 'photoUrl est requis' });
    return;
  }

  const userId = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { photos: user.photos.filter((photo) => photo !== photoUrl) },
  });

  await deletePhoto(photoKeyFromUrl(photoUrl));

  res.json(updated);
});

usersRouter.post('/:id/selfie', upload.single('selfie'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Une photo de selfie est requise' });
    return;
  }

  const userId = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const selfieHasFace = await imageContainsFace(file.buffer);
  if (!selfieHasFace) {
    res.status(400).json({ error: 'Aucun visage détecté sur ce selfie. Réessaie avec un meilleur éclairage.' });
    return;
  }

  let faceMatch = false;
  if (user.photos.length > 0) {
    const referenceBytes = await getPhotoBuffer(photoKeyFromUrl(user.photos[0]));
    if (referenceBytes) {
      const comparison = await compareFaces(file.buffer, referenceBytes);
      faceMatch = comparison.matched;
    }
  }

  const key = `${randomUUID()}${path.extname(file.originalname)}`;
  await uploadPhoto(key, file.buffer, file.mimetype);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { selfieUrl: `/uploads/${key}`, isVerified: faceMatch },
  });

  res.json({ ...updated, faceMatch });
});

usersRouter.post('/:id/change-email/request', async (req, res) => {
  const { newEmail } = req.body as { newEmail?: string };
  if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
    res.status(400).json({ error: 'Adresse email invalide' });
    return;
  }

  const userId = String(req.params.id);
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) {
    res.status(409).json({ error: 'Cette adresse email est déjà utilisée' });
    return;
  }

  const recentCode = await prisma.loginCode.findFirst({
    where: { email: newEmail, createdAt: { gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recentCode) {
    res.status(429).json({ error: 'Patiente quelques secondes avant de redemander un code' });
    return;
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.loginCode.create({ data: { email: newEmail, code, expiresAt } });
  await sendLoginCodeEmail(newEmail, code);

  res.json({ message: 'Code envoyé par email' });
});

usersRouter.post('/:id/change-email/verify', async (req, res) => {
  const { newEmail, code } = req.body as { newEmail?: string; code?: string };
  if (!newEmail || !code) {
    res.status(400).json({ error: 'newEmail et code sont requis' });
    return;
  }

  const userId = String(req.params.id);
  const loginCode = await prisma.loginCode.findFirst({
    where: { email: newEmail, code, usedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!loginCode) {
    res.status(400).json({ error: 'Code invalide ou expiré' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) {
    res.status(409).json({ error: 'Cette adresse email est déjà utilisée' });
    return;
  }

  await prisma.loginCode.update({ where: { id: loginCode.id }, data: { usedAt: new Date() } });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail },
    include: { musicProfile: true },
  });

  res.json(updated);
});

usersRouter.post('/:id/change-phone/request', async (req, res) => {
  const { newPhone } = req.body as { newPhone?: string };
  if (!newPhone || !PHONE_REGEX.test(newPhone)) {
    res.status(400).json({ error: 'Numéro de téléphone invalide' });
    return;
  }

  const userId = String(req.params.id);
  const existing = await prisma.user.findUnique({ where: { phone: newPhone } });
  if (existing && existing.id !== userId) {
    res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    return;
  }

  const recentCode = await prisma.loginCode.findFirst({
    where: { phone: newPhone, createdAt: { gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recentCode) {
    res.status(429).json({ error: 'Patiente quelques secondes avant de redemander un code' });
    return;
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.loginCode.create({ data: { phone: newPhone, code, expiresAt } });
  await sendLoginCodeSms(newPhone, code);

  res.json({ message: 'Code envoyé par SMS' });
});

usersRouter.post('/:id/change-phone/verify', async (req, res) => {
  const { newPhone, code } = req.body as { newPhone?: string; code?: string };
  if (!newPhone || !code) {
    res.status(400).json({ error: 'newPhone et code sont requis' });
    return;
  }

  const userId = String(req.params.id);
  const loginCode = await prisma.loginCode.findFirst({
    where: { phone: newPhone, code, usedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!loginCode) {
    res.status(400).json({ error: 'Code invalide ou expiré' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone: newPhone } });
  if (existing && existing.id !== userId) {
    res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    return;
  }

  await prisma.loginCode.update({ where: { id: loginCode.id }, data: { usedAt: new Date() } });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { phone: newPhone },
    include: { musicProfile: true },
  });

  res.json(updated);
});

usersRouter.delete('/:id', async (req, res) => {
  const userId = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await prisma.user.delete({ where: { id: userId } });
  res.json({ message: 'Compte supprimé' });
});
