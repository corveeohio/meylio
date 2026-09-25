-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyLikeAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingOptInAt" TIMESTAMP(3),
ADD COLUMN     "lastLikeAlertAt" TIMESTAMP(3);
