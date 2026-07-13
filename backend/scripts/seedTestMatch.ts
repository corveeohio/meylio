import { prisma } from '../src/prisma.js';

const TARGET_USER_ID = process.argv[2];

const FIRST_NAMES = ['Léa', 'Sam', 'Nino', 'Alex', 'Charlie'];

async function main() {
  if (!TARGET_USER_ID) {
    throw new Error('Usage: tsx scripts/seedTestMatch.ts <userId>');
  }

  const me = await prisma.user.findUnique({
    where: { id: TARGET_USER_ID },
    include: { musicProfile: true },
  });
  if (!me) throw new Error('Utilisateur cible introuvable');
  if (!me.musicProfile) throw new Error("L'utilisateur cible n'a pas encore de profil musical — termine d'abord l'onboarding");

  const candidateGender = me.genderPreference[0] ?? (me.gender === 'homme' ? 'femme' : 'homme');
  const displayName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];

  const sharedArtists = me.musicProfile.topArtists.slice(0, 2);
  const sharedGenres = me.musicProfile.topGenres.slice(0, 2);

  const candidate = await prisma.user.create({
    data: {
      displayName,
      age: (me.age ?? 25) + (Math.random() > 0.5 ? 1 : -1),
      gender: candidateGender,
      genderPreference: me.gender ? [me.gender] : [],
      relationshipIntent: me.relationshipIntent ?? 'serieux',
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
          topArtists: [...sharedArtists, 'Radiohead'],
          topGenres: sharedGenres.length > 0 ? sharedGenres : ['Pop'],
          topTracks: [],
        },
      },
    },
  });

  await prisma.like.upsert({
    where: { likerId_likedId: { likerId: candidate.id, likedId: TARGET_USER_ID } },
    create: { likerId: candidate.id, likedId: TARGET_USER_ID },
    update: {},
  });

  console.log('Candidat de test créé :', candidate.id, candidate.displayName);
  console.log('Like envoyé au compte cible — like-le en retour dans l’app pour déclencher le match.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
