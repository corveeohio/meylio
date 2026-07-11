-- AlterTable
ALTER TABLE "WaitlistSignup" ADD COLUMN     "phone" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "verificationToken" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistSignup_phone_key" ON "WaitlistSignup"("phone");

