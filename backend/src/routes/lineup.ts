import { Router } from 'express';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { prisma } from '../prisma.js';

export const lineupRouter = Router();

const APP_STORE_URL = 'https://apps.apple.com/app/id6790413692';

const WIDTH = 1080;
const HEIGHT = 1920;

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Pure vector shapes (no glyphs/fonts) so they always render regardless of
// whether the server has any fonts installed.
function musicNote(x: number, y: number, scale: number, opacity: number): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
    <ellipse cx="0" cy="34" rx="11" ry="8" fill="#FFFFFF" transform="rotate(-18 0 34)" />
    <rect x="9" y="-30" width="4" height="64" fill="#FFFFFF" />
    <path d="M13 -30 C 30 -26, 34 -10, 13 2 L13 -8 C 26 -14, 24 -22, 13 -22 Z" fill="#FFFFFF" />
  </g>`;
}

function equalizerBars(y: number, width: number, count: number, color: string, opacity: number): string {
  const barWidth = 6;
  const gap = (width - count * barWidth) / (count - 1);
  const startX = (WIDTH - width) / 2;
  let bars = '';
  for (let i = 0; i < count; i += 1) {
    const height = 14 + Math.abs(Math.sin(i * 0.9) * 46) + (i % 3) * 6;
    const x = startX + i * (barWidth + gap);
    bars += `<rect x="${x}" y="${y - height / 2}" width="${barWidth}" height="${height}" rx="3" fill="${color}" opacity="${opacity}" />`;
  }
  return bars;
}

function buildPosterSvg(displayName: string, artists: string[], qrDataUri: string): string {
  const headliners = artists.slice(0, 2);
  const supporting = artists.slice(2, 8);

  const headlinerLines = headliners
    .map(
      (artist, index) =>
        `<text x="50%" y="${560 + index * 130}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="88" font-weight="800" fill="#FFFFFF">${escapeXml(artist.toUpperCase())}</text>`
    )
    .join('\n');

  const supportingLines = supporting
    .map((artist, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = col === 0 ? '30%' : '70%';
      const y = 900 + row * 80;
      return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="600" fill="#C7C7D6">${escapeXml(artist)}</text>`;
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

    <text x="50%" y="220" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="46" font-weight="700" letter-spacing="14" fill="url(#brand)">MEYLIO FESTIVAL</text>
    <text x="50%" y="290" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" letter-spacing="4" fill="#9A9AA8">LE LINE-UP DE ${escapeXml(displayName.toUpperCase())}</text>
    ${equalizerBars(330, 460, 28, 'url(#brand)', 0.55)}
    ${headlinerLines}
    ${equalizerBars(790, 620, 40, '#2A2A35', 1)}
    ${supportingLines}
    ${equalizerBars(1300, 700, 46, '#2A2A35', 0.5)}
    <rect x="${WIDTH / 2 - 130}" y="${HEIGHT - 420}" width="260" height="260" rx="20" fill="#FFFFFF" />
    <image x="${WIDTH / 2 - 110}" y="${HEIGHT - 400}" width="220" height="220" href="${qrDataUri}" />
    <text x="50%" y="${HEIGHT - 110}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#FFFFFF">Scanne pour voir mon profil</text>
    <text x="50%" y="${HEIGHT - 65}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#9A9AA8">meylio.fr</text>
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
