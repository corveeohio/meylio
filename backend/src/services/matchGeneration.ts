import type { MusicProfile } from '@prisma/client';
import type { CompatibilityResult } from './compatibility.js';

export function generatePlaylist(a: MusicProfile, b: MusicProfile): string[] {
  const combinedTracks = [...new Set([...a.topTracks, ...b.topTracks])];
  if (combinedTracks.length > 0) return combinedTracks.slice(0, 15);

  const combinedArtists = [...new Set([...a.topArtists, ...b.topArtists])];
  return combinedArtists.slice(0, 15).map((artist) => `Top titre de ${artist}`);
}

export function generateIcebreaker(breakdown: CompatibilityResult['breakdown']): string {
  if (breakdown.sharedArtists.length > 0) {
    return `Vous écoutez tous les deux ${breakdown.sharedArtists[0]} — quel est ton morceau préféré ?`;
  }
  if (breakdown.sharedGenres.length > 0) {
    return `Vous partagez un goût pour le ${breakdown.sharedGenres[0]} — un artiste à me conseiller dans ce genre ?`;
  }
  return 'Vos goûts musicaux sont différents mais complémentaires — quelle est ta dernière découverte musicale ?';
}

const FALLBACK_QUESTIONS = [
  'Quel est l’album qui a changé ta vie musicale ?',
  'Concert ou festival, tu préfères quoi ?',
  'Une chanson que tu écoutes en boucle en ce moment ?',
  'Le pire souvenir musical de ta vie ?',
];

export function generateIcebreakerQuestions(breakdown: CompatibilityResult['breakdown']): string[] {
  const questions: string[] = [];
  const [artist1, artist2] = breakdown.sharedArtists;

  if (artist1) {
    questions.push(`Quel est ton morceau préféré de ${artist1} ?`);
  }
  if (artist2) {
    questions.push(`Entre ${artist1} et ${artist2}, lequel tu écoutes le plus ?`);
  }
  if (breakdown.sharedGenres[0]) {
    questions.push(`Quel est ton artiste préféré dans le style ${breakdown.sharedGenres[0]} en ce moment ?`);
  }

  for (const fallback of FALLBACK_QUESTIONS) {
    if (questions.length >= 4) break;
    questions.push(fallback);
  }

  return questions.slice(0, 4);
}
