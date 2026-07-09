import type { MusicProfile } from '@prisma/client';

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.map((value) => value.toLowerCase()));
  const setB = new Set(b.map((value) => value.toLowerCase()));
  const shared = [...setA].filter((value) => setB.has(value));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : shared.length / union.size;
}

function sharedValues(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((value) => value.toLowerCase()));
  return a.filter((value) => setB.has(value.toLowerCase()));
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
  const genreScore = jaccardSimilarity(a.topGenres, b.topGenres);
  const artistScore = jaccardSimilarity(a.topArtists, b.topArtists);
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
      sharedGenres: sharedValues(a.topGenres, b.topGenres),
      sharedArtists: sharedValues(a.topArtists, b.topArtists),
    },
  };
}
