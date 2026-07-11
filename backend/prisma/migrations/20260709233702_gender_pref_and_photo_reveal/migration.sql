-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "photosRevealedByA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photosRevealedByB" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "genderPreference" TEXT[] DEFAULT ARRAY[]::TEXT[];
