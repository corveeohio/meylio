import { Router } from 'express';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { prisma } from '../prisma.js';
import { computeCuratorBadge } from '../services/curator.js';
import {
  APP_STORE_URL,
  blackFont,
  boldFont,
  centeredText,
  equalizerBars,
  musicNote,
  pill,
  regularFont,
  textPathData,
} from '../services/svgPoster.js';

export const identityCardRouter = Router();

const WIDTH = 1080;
const HEIGHT = 1920;

function buildIdentityCardSvg(params: {
  displayName: string;
  genres: string[];
  artists: string[];
  curatorArtist: string | null;
  qrDataUri: string;
}): string {
  const { displayName, genres, artists, curatorArtist, qrDataUri } = params;

  const genrePills = (() => {
    const shown = genres.slice(0, 4);
    const gap = 16;
    const fontSize = 24;
    const paddingX = 28;
    const pillWidths = shown.map((genre) => textPathData(boldFont, genre.toUpperCase(), fontSize).width + paddingX * 2);
    const totalWidth = pillWidths.reduce((sum, w) => sum + w, 0) + gap * (shown.length - 1);
    let cursorX = (WIDTH - totalWidth) / 2;
    const y = 640;
    let svg = '';
    shown.forEach((genre, index) => {
      const pillWidth = pillWidths[index];
      const centerX = cursorX + pillWidth / 2;
      svg += pill(centerX, y, genre.toUpperCase(), boldFont, fontSize, 'rgba(255,255,255,0.1)', '#FFFFFF').svg;
      cursorX += pillWidth + gap;
    });
    return svg;
  })();

  const artistLines = artists
    .slice(0, 6)
    .map((artist, index) => centeredText(boldFont, artist, 42, 900 + index * 78, '#E8E6F0', WIDTH))
    .join('\n');

  const curatorBlock = curatorArtist
    ? centeredText(regularFont, `Découvreur de ${curatorArtist}`, 26, 1440, '#7C5CFF', WIDTH)
    : '';

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
      <clipPath id="avatarClip">
        <circle cx="${WIDTH / 2}" cy="440" r="110" />
      </clipPath>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />

    ${musicNote(110, 380, 1, 0.13)}
    ${musicNote(WIDTH - 130, 300, 0.8, 0.1)}
    ${musicNote(90, 1500, 0.9, 0.11)}
    ${musicNote(WIDTH - 100, 1600, 1.1, 0.13)}

    ${centeredText(boldFont, 'MEYLIO', 40, 200, 'url(#brand)', WIDTH, 16)}
    ${centeredText(regularFont, "MA CARTE D'IDENTITÉ MUSICALE", 24, 250, '#9A9AA8', WIDTH, 3)}

    <circle cx="${WIDTH / 2}" cy="440" r="114" fill="none" stroke="url(#brand)" stroke-width="4" />
    <circle cx="${WIDTH / 2}" cy="440" r="110" fill="#1B1230" />
    <g clip-path="url(#avatarClip)">
      <circle cx="${WIDTH / 2}" cy="440" r="110" fill="url(#brand)" opacity="0.25" />
    </g>

    ${centeredText(blackFont, displayName.toUpperCase(), 60, 610, '#FFFFFF', WIDTH)}
    ${genrePills}

    ${equalizerBars(760, 640, 36, 'url(#brand)', 0.5, WIDTH)}

    ${artistLines}

    ${curatorBlock}

    <rect x="${WIDTH / 2 - 130}" y="${HEIGHT - 420}" width="260" height="260" rx="20" fill="#FFFFFF" />
    <image x="${WIDTH / 2 - 110}" y="${HEIGHT - 400}" width="220" height="220" href="${qrDataUri}" />
    ${centeredText(boldFont, 'Trouve ta pop musicale sur Meylio', 30, HEIGHT - 110, '#FFFFFF', WIDTH)}
    ${centeredText(regularFont, 'meylio.fr', 24, HEIGHT - 65, '#9A9AA8', WIDTH)}
  </svg>`;
}

identityCardRouter.get('/:id/identity-card.png', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { musicProfile: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const artists = user.musicProfile?.topArtists ?? [];
  const genres = user.musicProfile?.topGenres ?? [];
  if (artists.length === 0 || genres.length === 0) {
    res.status(400).json({ error: "Complète d'abord ton profil musical pour générer ta carte" });
    return;
  }

  const { isCurator, discoveredArtist } = await computeCuratorBadge(user.id, artists);

  const qrDataUri = await QRCode.toDataURL(APP_STORE_URL, { margin: 0, width: 220 });
  const svg = buildIdentityCardSvg({
    displayName: user.displayName ?? 'Toi',
    genres,
    artists,
    curatorArtist: isCurator ? discoveredArtist : null,
    qrDataUri,
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  res.send(png);
});
