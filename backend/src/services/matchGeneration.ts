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
