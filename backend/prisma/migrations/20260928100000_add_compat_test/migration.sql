-- CreateTable
CREATE TABLE "CompatTest" (
    "id" TEXT NOT NULL,
    "aName" TEXT,
    "aGenres" TEXT[],
    "aArtists" TEXT[],
    "bName" TEXT,
    "bGenres" TEXT[],
    "bArtists" TEXT[],
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompatTest_pkey" PRIMARY KEY ("id")
);
