-- CreateTable
CREATE TABLE "IcebreakerQuestion" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IcebreakerQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcebreakerAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IcebreakerAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IcebreakerQuestion_matchId_idx" ON "IcebreakerQuestion"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "IcebreakerAnswer_questionId_userId_key" ON "IcebreakerAnswer"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "IcebreakerQuestion" ADD CONSTRAINT "IcebreakerQuestion_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcebreakerAnswer" ADD CONSTRAINT "IcebreakerAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "IcebreakerQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcebreakerAnswer" ADD CONSTRAINT "IcebreakerAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
