import type { MusicProfile } from '@prisma/client';
import { UNKNOWN_STYLE, normalizeArtistName, toGenreFamilies } from './genreFamilies.js';

const STYLE_MATCH_WEIGHT = 0.6;

// Overlap relative to the smaller list: someone who picked 2 genres and shares both
// with a 12-genre Spotify profile is a full genre match, which Jaccard scored ~15 %.
function overlapSimilarity(setA: Set<string>, setB: Set<string>): number {
  const smaller = Math.min(setA.size, setB.size);
  if (smaller === 0) return 0;
  const shared = [...setA].filter((value) => setB.has(value)).length;
  return shared / smaller;
}

function sharedArtists(a: string[], b: string[]): string[] {
  const keysB = new Set(b.map(normalizeArtistName));
  return a.filter((name) => keysB.has(normalizeArtistName(name)));
}

function audioFeatureSimilarity(a: MusicProfile, b: MusicProfile): number | null {
  const pairs: Array<[number | null, number | null]> = [
    [a.energy, b.energy],
    [a.valence, b.valence],
    [a.tempoAvg && b.tempoAvg ? a.tempoAvg / 200 : null, a.tempoAvg && b.tempoAvg ? b.tempoAvg / 200 : null],
  ];

  const usablePairs = pairs.filter(([x, y]) => x !== null && y !== null) as Array<[number, number]>;
  if (usablePairs.length === 0) return null;

  const avgDistance =
    usablePairs.reduce((sum, [x, y]) => sum + Math.abs(x - y), 0) / usablePairs.length;
  return 1 - Math.min(avgDistance, 1);
}

export type CompatibilityResult = {
  score: number;
  breakdown: {
    genreScore: number;
    artistScore: number;
    audioFeatureScore: number | null;
    sharedGenres: string[];
    sharedArtists: string[];
  };
};

export function computeCompatibility(a: MusicProfile, b: MusicProfile): CompatibilityResult {
  const familiesA = toGenreFamilies(a.topGenres);
  const familiesB = new Set(toGenreFamilies(b.topGenres));
  const genreScore = overlapSimilarity(new Set(familiesA), familiesB);
  const exactArtistScore = overlapSimilarity(
    new Set(a.topArtists.map(normalizeArtistName)),
    new Set(b.topArtists.map(normalizeArtistName))
  );
  // Different artists of the same style (Damso / Ninho) still count, at a lower weight
  // than listening to the very same artists.
  const knownStyles = (styles: string[]) => new Set(styles.filter((style) => style !== UNKNOWN_STYLE));
  const artistStyleScore = overlapSimilarity(knownStyles(a.artistStyles), knownStyles(b.artistStyles));
  const artistScore = exactArtistScore + (1 - exactArtistScore) * STYLE_MATCH_WEIGHT * artistStyleScore;
  const audioFeatureScore = audioFeatureSimilarity(a, b);

  const weights = { genre: 0.5, artist: 0.3, audio: 0.2 };
  const activeWeight = weights.genre + weights.artist + (audioFeatureScore !== null ? weights.audio : 0);
  const rawScore =
    genreScore * weights.genre +
    artistScore * weights.artist +
    (audioFeatureScore ?? 0) * (audioFeatureScore !== null ? weights.audio : 0);

  const score = Math.round((rawScore / activeWeight) * 100);

  return {
    score,
    breakdown: {
      genreScore: Math.round(genreScore * 100),
      artistScore: Math.round(artistScore * 100),
      audioFeatureScore: audioFeatureScore !== null ? Math.round(audioFeatureScore * 100) : null,
      sharedGenres: familiesA.filter((family) => familiesB.has(family)),
      sharedArtists: sharedArtists(a.topArtists, b.topArtists),
    },
  };
}
