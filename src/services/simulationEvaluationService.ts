import type { SalesSkill } from '../schemas/coaching';
import { SALES_SKILLS, SalesEvaluationLLMSchema, normalizeRawEvaluatorOutput } from '../schemas/coaching';
import { EvaluationError } from '../errors/evaluationErrors';
import { prisma } from '../db';
import { selectTopWeaknesses } from '../domain/weaknessSelection';
import { mergeRecommendedTips } from '../domain/coaching/mergeRecommendedTips';
import { computeTranscriptMetrics, formatTranscriptNumbered } from './transcriptMetrics';
import { llm } from './llm';
import { updateProfilesAfterSimulation } from './weaknessProfileService';
import { Prisma } from '../../generated/prisma';
import type { SalesSkill as PrismaSkill } from '../../generated/prisma';

function scoresFromParsed(parsed: {
  skills: Record<
    SalesSkill,
    {
      score: number;
      reasoning: string;
    }
  >;
}): Record<SalesSkill, number> {
  const out = {} as Record<SalesSkill, number>;
  for (const s of SALES_SKILLS) {
    out[s] = parsed.skills[s].score;
  }
  return out;
}

export async function evaluateConversation(conversationId: string) {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      persona: true,
    },
  });

  if (!convo) {
    throw new Error('conversation not found');
  }
  if (convo.messages.length === 0) {
    throw new Error('no messages to evaluate');
  }

  const metrics = computeTranscriptMetrics(convo.messages);
  const transcript = formatTranscriptNumbered(convo.messages);

  const raw = await llm.evaluateSalesSkills({
    transcript,
    personaName: convo.persona?.name ?? '',
    metrics,
  });

  const normalized = normalizeRawEvaluatorOutput(raw);
  const parseResult = SalesEvaluationLLMSchema.safeParse(normalized);
  if (!parseResult.success) {
    if (process.env.VITEST !== 'true') {
      console.error('[evaluateConversation] Evaluator output failed schema validation', {
        zodErrors: parseResult.error.flatten(),
        rawOutput: JSON.stringify(raw).slice(0, 2000),
      });
    }
    throw new EvaluationError(
      'Evaluator output failed validation',
      'EVALUATOR_VALIDATION',
      parseResult.error
    );
  }
  const parsed = parseResult.data;
  const skillScores = scoresFromParsed(parsed);

  const weaknesses = selectTopWeaknesses(skillScores);

  const mergedTips = mergeRecommendedTips({
    llmTips: parsed.recommendedTips,
    weaknesses,
  });

  const storedEvaluator = {
    ...parsed,
    recommendedTips: mergedTips,
  };

  const rawJson = storedEvaluator as unknown as Record<string, unknown>;

  await prisma.$transaction(async (tx) => {
    await tx.simulationSkillScore.deleteMany({ where: { conversationId } });

    await tx.simulationEvaluationSummary.upsert({
      where: { conversationId },
      create: {
        userId: convo.userId,
        conversationId,
        questionCount: metrics.questionCount,
        avgMessageLength: metrics.avgMessageLength,
        talkRatio: metrics.talkRatio,
        weaknesses: weaknesses as unknown as Prisma.InputJsonValue,
        recommendedTips: mergedTips as unknown as Prisma.InputJsonValue,
        rawEvaluatorOutput: rawJson as Prisma.InputJsonValue,
      },
      update: {
        userId: convo.userId,
        questionCount: metrics.questionCount,
        avgMessageLength: metrics.avgMessageLength,
        talkRatio: metrics.talkRatio,
        weaknesses: weaknesses as unknown as Prisma.InputJsonValue,
        recommendedTips: mergedTips as unknown as Prisma.InputJsonValue,
        rawEvaluatorOutput: rawJson as Prisma.InputJsonValue,
      },
    });

    await tx.simulationSkillScore.createMany({
      data: SALES_SKILLS.map((skill) => ({
        userId: convo.userId,
        conversationId,
        skill: skill as PrismaSkill,
        score: skillScores[skill],
        reasoning: parsed.skills[skill].reasoning,
      })),
    });
  });

  if (convo.userId) {
    await updateProfilesAfterSimulation({
      userId: convo.userId,
      conversationId,
      skillScores,
    });
  }

  const summary = await prisma.simulationEvaluationSummary.findUnique({
    where: { conversationId },
  });
  const scores = await prisma.simulationSkillScore.findMany({
    where: { conversationId },
    orderBy: { skill: 'asc' },
  });

  const profiles = convo.userId
    ? await prisma.userWeaknessProfile.findMany({
        where: { userId: convo.userId },
        orderBy: { skill: 'asc' },
      })
    : [];

  return {
    conversationId,
    summary: summary!,
    skillScores: scores,
    weaknessProfile: profiles,
  };
}

export async function getEvaluationForConversation(conversationId: string) {
  const summary = await prisma.simulationEvaluationSummary.findUnique({
    where: { conversationId },
  });
  const skillScores = await prisma.simulationSkillScore.findMany({
    where: { conversationId },
    orderBy: { skill: 'asc' },
  });
  if (!summary) return null;
  return { summary, skillScores };
}
