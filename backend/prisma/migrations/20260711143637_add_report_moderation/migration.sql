-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'dismissed', 'action_taken');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;
