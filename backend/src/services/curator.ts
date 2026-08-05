import { prisma } from '../prisma.js';

const NICHE_MAX_LISTENERS = 2;

export async function computeCuratorBadge(
  userId: string,
  topArtists: string[]
): Promise<{ isCurator: boolean; discoveredArtist: string | null }> {
  if (topArtists.length === 0) return { isCurator: false, discoveredArtist: null };

  const others = await prisma.musicProfile.findMany({
    where: { userId: { not: userId }, topArtists: { hasSome: topArtists } },
    select: { topArtists: true },
  });

  for (const artist of topArtists) {
    const listenerCount = others.filter((profile) => profile.topArtists.includes(artist)).length;
    if (listenerCount <= NICHE_MAX_LISTENERS) {
      return { isCurator: true, discoveredArtist: artist };
    }
  }

  return { isCurator: false, discoveredArtist: null };
}
