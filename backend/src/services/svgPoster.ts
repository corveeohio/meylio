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

export function musicNote(x: number, y: number, scale: number, opacity: number): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
    <ellipse cx="0" cy="34" rx="11" ry="8" fill="#FFFFFF" transform="rotate(-18 0 34)" />
    <rect x="9" y="-30" width="4" height="64" fill="#FFFFFF" />
    <path d="M13 -30 C 30 -26, 34 -10, 13 2 L13 -8 C 26 -14, 24 -22, 13 -22 Z" fill="#FFFFFF" />
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
