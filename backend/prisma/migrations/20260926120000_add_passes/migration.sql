-- CreateTable
CREATE TABLE "Pass" (
    "id" TEXT NOT NULL,
    "passerId" TEXT NOT NULL,
    "passedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pass_passerId_passedId_key" ON "Pass"("passerId", "passedId");

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_passerId_fkey" FOREIGN KEY ("passerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_passedId_fkey" FOREIGN KEY ("passedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
