-- AlterTable: add columns as nullable first to preserve existing rows
ALTER TABLE "WaitlistSignup" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WaitlistSignup" ADD COLUMN "verificationToken" TEXT;

-- Backfill existing rows with a random token
UPDATE "WaitlistSignup" SET "verificationToken" = gen_random_uuid()::text WHERE "verificationToken" IS NULL;

-- Now enforce NOT NULL and uniqueness
ALTER TABLE "WaitlistSignup" ALTER COLUMN "verificationToken" SET NOT NULL;
CREATE UNIQUE INDEX "WaitlistSignup_verificationToken_key" ON "WaitlistSignup"("verificationToken");
