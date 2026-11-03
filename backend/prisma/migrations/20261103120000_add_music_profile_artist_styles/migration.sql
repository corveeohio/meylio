-- AlterTable
ALTER TABLE "MusicProfile" ADD COLUMN     "artistStyles" TEXT[] DEFAULT ARRAY[]::TEXT[];
