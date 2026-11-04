import fs from 'node:fs';
import opentype from 'opentype.js';

// Text is rendered to SVG paths from a bundled font instead of <text>
// elements: the production server has no fonts installed, and relying on
// one being present (system fonts, fontconfig, etc.) silently produces
// blank/tofu output. Vector paths render identically everywhere.
export const regularFont = opentype.parse(
  fs.readFileSync(
    new URL('../../node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff', import.meta.url)
  ).buffer
);
export const boldFont = opentype.parse(
  fs.readFileSync(
    new URL('../../node_modules/@fontsource/roboto/files/roboto-latin-700-normal.woff', import.meta.url)
  ).buffer
);
export const blackFont = opentype.parse(
  fs.readFileSync(
    new URL('../../node_modules/@fontsource/roboto/files/roboto-latin-900-normal.woff', import.meta.url)
  ).buffer
);

export function textPathData(font: opentype.Font, text: string, fontSize: number, letterSpacing = 0) {
  const scale = fontSize / font.unitsPerEm;
  let x = 0;
  let d = '';
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    d += glyph.getPath(x, 0, fontSize).toPathData(2);
    x += (glyph.advanceWidth ?? 0) * scale + letterSpacing;
  }
  return { d, width: x };
}

export function centeredText(
  font: opentype.Font,
  text: string,
  fontSize: number,
  baselineY: number,
  fill: string,
  canvasWidth: number,
  letterSpacing = 0
): string {
  const { d, width } = textPathData(font, text, fontSize, letterSpacing);
  const offsetX = (canvasWidth - width) / 2;
  return `<path transform="translate(${offsetX} ${baselineY})" fill="${fill}" d="${d}" />`;
}

export function leftText(
  font: opentype.Font,
  text: string,
  fontSize: number,
  x: number,
  baselineY: number,
  fill: string,
  letterSpacing = 0
): string {
  const { d } = textPathData(font, text, fontSize, letterSpacing);
  return `<path transform="translate(${x} ${baselineY})" fill="${fill}" d="${d}" />`;
}

export function columnText(
  font: opentype.Font,
  text: string,
  fontSize: number,
  centerX: number,
  baselineY: number,
  fill: string
): string {
  const { d, width } = textPathData(font, text, fontSize);
  const offsetX = centerX - width / 2;
  return `<path transform="translate(${offsetX} ${baselineY})" fill="${fill}" d="${d}" />`;
}

export function musicNote(x: number, y: number, scale: number, opacity: number, fill = '#FFFFFF'): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
    <ellipse cx="0" cy="34" rx="11" ry="8" fill="${fill}" transform="rotate(-18 0 34)" />
    <rect x="9" y="-30" width="4" height="64" fill="${fill}" />
    <path d="M13 -30 C 30 -26, 34 -10, 13 2 L13 -8 C 26 -14, 24 -22, 13 -22 Z" fill="${fill}" />
  </g>`;
}

// Same heart + equalizer mark as the app icon (mobile/src/components/MeylioLogo.tsx).
const LOGO_HEART_PATH =
  'M12,21.35 L10.55,20.03 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 C9.24,3 10.91,3.81 12,5.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 C22,12.28 18.6,15.36 13.45,20.04 L12,21.35 Z';
const LOGO_BARS = [
  { x: 6.5, height: 5, y: 13.5 },
  { x: 9, height: 8, y: 10.5 },
  { x: 11.5, height: 11, y: 7.5 },
  { x: 14, height: 7, y: 11.5 },
  { x: 16.5, height: 4.5, y: 14 },
];

/** A vinyl record with grooves, a light sheen and a brand-gradient label holding the logo. */
export function vinylRecord(cx: number, cy: number, r: number): string {
  const grooves = Array.from({ length: 9 }, (_, i) => r * (0.48 + i * 0.055))
    .map((radius) => `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1.5" />`)
    .join('');
  const labelR = r * 0.36;
  return `<defs>
      <linearGradient id="vinylSheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0" />
        <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.10" />
        <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="vinylLabel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7C5CFF" />
        <stop offset="1" stop-color="#FF5CA8" />
      </linearGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="none" stroke="url(#vinylLabel)" stroke-width="3" stroke-opacity="0.6" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0B0912" />
    ${grooves}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#vinylSheen)" />
    <circle cx="${cx}" cy="${cy}" r="${labelR}" fill="url(#vinylLabel)" />
    <g opacity="0.9">${logoMark(cx, cy, labelR * 1.1, '#FFFFFF', '#7C5CFF')}</g>`;
}

function logoMark(cx: number, cy: number, size: number, heartFill: string, barFill: string): string {
  const scale = size / 24;
  const bars = LOGO_BARS.map(
    (bar) => `<rect x="${bar.x}" y="${bar.y}" width="1.6" height="${bar.height}" rx="0.8" fill="${barFill}" fill-opacity="0.55" />`
  ).join('');
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})">
      <path d="${LOGO_HEART_PATH}" fill="${heartFill}" />
      ${bars}
    </g>`;
}

/** The Meylio logo centered on (cx, cy), `size` pixels wide. */
export function meylioLogo(cx: number, cy: number, size: number): string {
  const scale = size / 24;
  const bars = LOGO_BARS.map(
    (bar) =>
      `<rect x="${bar.x}" y="${bar.y}" width="1.6" height="${bar.height}" rx="0.8" fill="#0F0F14" fill-opacity="0.55" clip-path="url(#logoHeartClip)" />`
  ).join('');
  return `<defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7C5CFF" />
        <stop offset="1" stop-color="#FF5CA8" />
      </linearGradient>
      <clipPath id="logoHeartClip"><path d="${LOGO_HEART_PATH}" /></clipPath>
    </defs>
    <g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})">
      <path d="${LOGO_HEART_PATH}" fill="url(#logoGradient)" />
      ${bars}
    </g>`;
}

export function equalizerBars(
  y: number,
  width: number,
  count: number,
  color: string,
  opacity: number,
  canvasWidth: number
): string {
  const barWidth = 6;
  const gap = (width - count * barWidth) / (count - 1);
  const startX = (canvasWidth - width) / 2;
  let bars = '';
  for (let i = 0; i < count; i += 1) {
    const height = 14 + Math.abs(Math.sin(i * 0.9) * 46) + (i % 3) * 6;
    const x = startX + i * (barWidth + gap);
    bars += `<rect x="${x}" y="${y - height / 2}" width="${barWidth}" height="${height}" rx="3" fill="${color}" opacity="${opacity}" />`;
  }
  return bars;
}

export function pill(
  centerX: number,
  y: number,
  text: string,
  font: opentype.Font,
  fontSize: number,
  fill: string,
  textFill: string
): { svg: string; width: number } {
  const { d, width } = textPathData(font, text, fontSize);
  const paddingX = 28;
  const pillWidth = width + paddingX * 2;
  const pillHeight = fontSize + 30;
  const x = centerX - pillWidth / 2;
  const textOffsetX = x + paddingX;
  const svg = `<g>
    <rect x="${x}" y="${y}" width="${pillWidth}" height="${pillHeight}" rx="${pillHeight / 2}" fill="${fill}" />
    <path transform="translate(${textOffsetX} ${y + pillHeight - 18})" fill="${textFill}" d="${d}" />
  </g>`;
  return { svg, width: pillWidth };
}

export const APP_STORE_URL = 'https://apps.apple.com/app/id6790413692';
