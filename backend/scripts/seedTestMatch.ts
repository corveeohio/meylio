import { prisma } from '../src/prisma.js';

const REAL_USER_ID = 'b8657477-4b43-45e7-8e60-0b5a2227918b';

async function main() {
  const me = await prisma.user.findUnique({ where: { id: REAL_USER_ID } });
  if (!me) throw new Error('Utilisateur réel introuvable');

  const candidate = await prisma.user.create({
    data: {
      displayName: 'Léa',
      age: 23,
      gender: 'homme',
      genderPreference: ['homme'],
      relationshipIntent: 'amitie',
      photos: ['/uploads/5316715f-46a6-4cd7-adb5-d511787fd475.jpg'],
      isVerified: true,
      termsAcceptedAt: new Date(),
      locationOptIn: true,
      lastLatitude: (me.lastLatitude ?? 48.8566) + 0.02,
      lastLongitude: (me.lastLongitude ?? 2.3522) + 0.015,
      lastLocationAt: new Date(),
      lastActiveAt: new Date(),
      musicProfile: {
        create: {
          source: 'manual',
          topArtists: ['Metallica', 'Dirge', 'Radiohead'],
          topGenres: ['Rock', 'Pop'],
          topTracks: [],
        },
      },
    },
  });

  await prisma.like.upsert({
    where: { likerId_likedId: { likerId: candidate.id, likedId: REAL_USER_ID } },
    create: { likerId: candidate.id, likedId: REAL_USER_ID },
    update: {},
  });

  console.log('Candidat de test créé :', candidate.id, candidate.displayName);
  console.log('Like envoyé à ton compte — like-le en retour dans l’app pour déclencher le match.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
