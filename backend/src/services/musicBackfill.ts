import { prisma } from '../prisma.js';
import { inferGenresFromArtists } from './appleMusic.js';
import { UNKNOWN_STYLE, isMeaningfulGenre, toGenreFamilies } from './genreFamilies.js';

const BATCH_SIZE = 50;
const PAUSE_BETWEEN_PROFILES_MS = 300;

/**
 * Profiles saved before artist styles existed have none, and some have artists but no
 * usable genre. Fills both in the background after a deploy, gently on the iTunes API.
 */
export async function backfillMusicProfiles(): Promise<void> {
  let updated = 0;
  for (;;) {
    const profiles = await prisma.musicProfile.findMany({
      where: { artistStyles: { isEmpty: true }, NOT: { topArtists: { isEmpty: true } } },
      take: BATCH_SIZE,
    });
    if (profiles.length === 0) break;

    for (const profile of profiles) {
      const artistGenres = await inferGenresFromArtists(profile.topArtists);
      const artistStyles = toGenreFamilies(artistGenres);
      const hasGenres = profile.topGenres.some(isMeaningfulGenre);
      await prisma.musicProfile.update({
        where: { id: profile.id },
        data: {
          artistStyles: artistStyles.length > 0 ? artistStyles : [UNKNOWN_STYLE],
          ...(!hasGenres && { topGenres: artistGenres.filter(isMeaningfulGenre) }),
        },
      });
      updated++;
      await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_PROFILES_MS));
    }
  }
  if (updated > 0) console.log(`[backfill] ${updated} profils musicaux complétés`);
}
