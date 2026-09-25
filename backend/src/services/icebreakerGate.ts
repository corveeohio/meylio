import { prisma } from '../prisma.js';

export const ICEBREAKER_REQUIRED_FROM = new Date(process.env.ICEBREAKER_REQUIRED_FROM ?? '2026-09-26T00:00:00Z');

export async function getIcebreakerStatus(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { icebreakerQuestions: { include: { answers: { where: { userId } } } } },
  });
  if (!match) return null;

  const total = match.icebreakerQuestions.length;
  const answered = match.icebreakerQuestions.filter((question) => question.answers.length > 0).length;
  return {
    required: total > 0 && match.createdAt >= ICEBREAKER_REQUIRED_FROM,
    total,
    answered,
    answeredAll: total === 0 || answered === total,
  };
}
