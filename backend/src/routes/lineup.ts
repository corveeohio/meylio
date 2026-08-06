import { Router } from 'express';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { prisma } from '../prisma.js';
import {
  APP_STORE_URL,
  blackFont,
  boldFont,
  centeredText,
  columnText,
  equalizerBars,
  musicNote,
  regularFont,
} from '../services/svgPoster.js';

export const lineupRouter = Router();

const WIDTH = 1080;
const HEIGHT = 1920;

function buildPosterSvg(displayName: string, artists: string[], qrDataUri: string): string {
  const headliners = artists.slice(0, 2);
  const supporting = artists.slice(2, 8);

  const headlinerLines = headliners
    .map((artist, index) => centeredText(blackFont, artist.toUpperCase(), 88, 560 + index * 130, '#FFFFFF', WIDTH))
    .join('\n');

  const supportingLines = supporting
    .map((artist, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const centerX = col === 0 ? WIDTH * 0.3 : WIDTH * 0.7;
      const y = 900 + row * 80;
      return columnText(boldFont, artist, 36, centerX, y, '#C7C7D6');
    })
    .join('\n');

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F0F14" />
        <stop offset="55%" stop-color="#1B1230" />
        <stop offset="100%" stop-color="#0F0F14" />
      </linearGradient>
      <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7C5CFF" />
        <stop offset="100%" stop-color="#FF5CA8" />
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />

    ${musicNote(120, 460, 1.1, 0.14)}
    ${musicNote(WIDTH - 140, 620, 0.85, 0.12)}
    ${musicNote(100, 1180, 0.9, 0.1)}
    ${musicNote(WIDTH - 110, 1050, 1.2, 0.13)}

    ${centeredText(boldFont, 'MEYLIO FESTIVAL', 46, 220, 'url(#brand)', WIDTH, 14)}
    ${centeredText(regularFont, `LE LINE-UP DE ${displayName.toUpperCase()}`, 28, 290, '#9A9AA8', WIDTH, 4)}
    ${equalizerBars(330, 460, 28, 'url(#brand)', 0.55, WIDTH)}
    ${headlinerLines}
    ${equalizerBars(790, 620, 40, '#2A2A35', 1, WIDTH)}
    ${supportingLines}
    ${equalizerBars(1300, 700, 46, '#2A2A35', 0.5, WIDTH)}
    <rect x="${WIDTH / 2 - 130}" y="${HEIGHT - 420}" width="260" height="260" rx="20" fill="#FFFFFF" />
    <image x="${WIDTH / 2 - 110}" y="${HEIGHT - 400}" width="220" height="220" href="${qrDataUri}" />
    ${centeredText(boldFont, 'Scanne pour voir mon profil', 30, HEIGHT - 110, '#FFFFFF', WIDTH)}
    ${centeredText(regularFont, 'meylio.fr', 24, HEIGHT - 65, '#9A9AA8', WIDTH)}
  </svg>`;
}

lineupRouter.get('/:id/lineup.png', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { musicProfile: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const artists = user.musicProfile?.topArtists ?? [];
  if (artists.length === 0) {
    res.status(400).json({ error: "Complète d'abord ton profil musical pour générer ton line-up" });
    return;
  }

  const qrDataUri = await QRCode.toDataURL(APP_STORE_URL, { margin: 0, width: 220 });
  const svg = buildPosterSvg(user.displayName ?? 'Toi', artists, qrDataUri);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  res.send(png);
});
