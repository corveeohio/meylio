import { Router } from 'express';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { prisma } from '../prisma.js';
import {
  APP_STORE_URL,
  blackFont,
  boldFont,
  centeredText,
  equalizerBars,
  musicNote,
  regularFont,
} from '../services/svgPoster.js';

export const compatibilityCardRouter = Router();

const WIDTH = 1080;
const HEIGHT = 1920;

function buildCompatibilityCardSvg(params: {
  nameA: string;
  nameB: string;
  score: number;
  sharedArtists: string[];
  sharedGenres: string[];
  qrDataUri: string;
}): string {
  const { nameA, nameB, score, sharedArtists, sharedGenres, qrDataUri } = params;

  const sharedArtistLines = sharedArtists
    .slice(0, 4)
    .map((artist, index) => centeredText(boldFont, artist, 38, 1180 + index * 70, '#E8E6F0', WIDTH))
    .join('\n');

  const genresLine = sharedGenres.slice(0, 4).join(' · ');

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#14101F" />
        <stop offset="55%" stop-color="#1F1433" />
        <stop offset="100%" stop-color="#0F0F14" />
      </linearGradient>
      <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7C5CFF" />
        <stop offset="100%" stop-color="#FF5CA8" />
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />

    ${musicNote(110, 380, 1, 0.13)}
    ${musicNote(WIDTH - 130, 300, 0.8, 0.1)}
    ${musicNote(90, 1500, 0.9, 0.11)}
    ${musicNote(WIDTH - 100, 1600, 1.1, 0.13)}

    ${centeredText(boldFont, 'MEYLIO', 40, 200, 'url(#brand)', WIDTH, 16)}
    ${centeredText(regularFont, 'BLIND TEST DE COMPATIBILITÉ', 24, 250, '#9A9AA8', WIDTH, 3)}

    ${centeredText(regularFont, `${nameA.toUpperCase()}  ×  ${nameB.toUpperCase()}`, 32, 420, '#C7C7D6', WIDTH, 2)}

    ${centeredText(blackFont, `${score}%`, 200, 700, 'url(#brand)', WIDTH)}
    ${centeredText(boldFont, 'COMPATIBLES', 32, 760, '#FFFFFF', WIDTH, 8)}

    ${equalizerBars(880, 640, 36, 'url(#brand)', 0.5, WIDTH)}

    ${genresLine ? centeredText(regularFont, genresLine.toUpperCase(), 26, 1000, '#9A9AA8', WIDTH, 2) : ''}
    ${sharedArtists.length > 0 ? centeredText(regularFont, 'Artistes en commun', 24, 1110, '#7C5CFF', WIDTH, 2) : ''}
    ${sharedArtistLines}

    <rect x="${WIDTH / 2 - 130}" y="${HEIGHT - 420}" width="260" height="260" rx="20" fill="#FFFFFF" />
    <image x="${WIDTH / 2 - 110}" y="${HEIGHT - 400}" width="220" height="220" href="${qrDataUri}" />
    ${centeredText(boldFont, 'Teste ta compatibilité sur Meylio', 30, HEIGHT - 110, '#FFFFFF', WIDTH)}
    ${centeredText(regularFont, 'meylio.fr', 24, HEIGHT - 65, '#9A9AA8', WIDTH)}
  </svg>`;
}

compatibilityCardRouter.get('/:matchId/compatibility-card.png', async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.matchId },
    include: { userA: true, userB: true },
  });
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const breakdown = match.compatibilityBreakdown as {
    sharedArtists?: string[];
    sharedGenres?: string[];
  } | null;

  const qrDataUri = await QRCode.toDataURL(APP_STORE_URL, { margin: 0, width: 220 });
  const svg = buildCompatibilityCardSvg({
    nameA: match.userA.displayName ?? 'Toi',
    nameB: match.userB.displayName ?? 'Match',
    score: Math.round(match.compatibilityScore),
    sharedArtists: breakdown?.sharedArtists ?? [],
    sharedGenres: breakdown?.sharedGenres ?? [],
    qrDataUri,
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  res.send(png);
});
