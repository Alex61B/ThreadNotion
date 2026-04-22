import { llm } from './llm';
import {
  MomentClassificationLLMSchema,
  MomentRubricLLMSchema,
  parseMomentCoachingEntries,
} from '../schemas/momentCoaching';
import type {
  DetectedMoment,
  MomentCoachingEntry,
  MomentCoachingResult,
  MomentEvaluationLLM,
} from '../schemas/momentCoaching';
import {
  getPlaybook,
  getPlaybookDescriptionsForClassification,
} from '../domain/coaching/momentPlaybooks';
import type { MomentPlaybook } from '../domain/coaching/momentPlaybooks';

type MessageLike = {
  role: string;
  content: string;
};

const MIN_MESSAGES_FOR_COACHING = 4;

export async function runMomentCoaching(args: {
  messages: MessageLike[];
  transcript: string;
  personaName: string;
}): Promise<MomentCoachingResult | null> {
  const { messages, transcript, personaName } = args;

  if (messages.length < MIN_MESSAGES_FOR_COACHING) {
    return null;
  }

  const momentTypeDescriptions = getPlaybookDescriptionsForClassification();

  const rawClassification = await llm.classifyConversationMoments({
    transcript,
    momentTypeDescriptions,
  });

  const classificationResult = MomentClassificationLLMSchema.safeParse(rawClassification);
  if (!classificationResult.success) {
    console.error(
      '[momentCoachingService] Moment classification failed Zod validation',
      classificationResult.error.flatten()
    );
    return { entries: [], detectedMomentCount: 0 };
  }

  const { detectedMoments } = classificationResult.data;

  if (detectedMoments.length === 0) {
    return { entries: [], detectedMomentCount: 0 };
  }

  const playbooks: MomentPlaybook[] = detectedMoments.map((m) => getPlaybook(m.momentType));

  const momentsToEvaluate = detectedMoments.map((m, i) => {
    const pb = playbooks[i]!;
    return {
      momentType: m.momentType,
      label: pb.label,
      customerExcerpt: m.customerExcerpt,
      associateExcerpt: m.associateExcerpt,
      customerTurnIndex: m.customerTurnIndex,
      associateTurnIndex: m.associateTurnIndex,
      playbookSteps: pb.steps,
      strongExample: pb.strongExample,
      weakExample: pb.weakExample,
      coachingGuidance: pb.coachingGuidance,
    };
  });

  const rawRubric = await llm.evaluateMomentResponses({
    transcript,
    personaName,
    momentsToEvaluate,
  });

  const rubricResult = MomentRubricLLMSchema.safeParse(rawRubric);
  if (!rubricResult.success) {
    console.error(
      '[momentCoachingService] Moment rubric evaluation failed Zod validation',
      rubricResult.error.flatten()
    );
    return { entries: [], detectedMomentCount: detectedMoments.length };
  }

  const entries = buildMomentCoachingEntries(
    detectedMoments,
    playbooks,
    rubricResult.data.momentEvaluations
  );

  return {
    entries,
    detectedMomentCount: detectedMoments.length,
  };
}

export function buildMomentCoachingEntries(
  detectedMoments: DetectedMoment[],
  playbooks: MomentPlaybook[],
  evaluations: MomentEvaluationLLM[]
): MomentCoachingEntry[] {
  const evalByType = new Map<string, MomentEvaluationLLM>();
  for (const e of evaluations) {
    evalByType.set(e.momentType, e);
  }

  const entries: MomentCoachingEntry[] = [];

  for (let i = 0; i < detectedMoments.length; i++) {
    const detected = detectedMoments[i]!;
    const playbook = playbooks[i]!;
    const evaluation = evalByType.get(detected.momentType);

    if (!evaluation) continue;

    const stepResultsByNumber = new Map(evaluation.stepResults.map((r) => [r.stepNumber, r]));

    const stepResults = playbook.steps.map((step) => {
      const llmResult = stepResultsByNumber.get(step.stepNumber);
      return {
        stepNumber: step.stepNumber,
        description: step.description,
        addressed: llmResult?.addressed ?? false,
        observation: llmResult?.observation ?? '',
      };
    });

    entries.push({
      momentType: detected.momentType,
      label: playbook.label,
      skillMappings: playbook.skillMappings,
      customerExcerpt: detected.customerExcerpt,
      associateExcerpt: detected.associateExcerpt,
      customerTurnIndex: detected.customerTurnIndex,
      associateTurnIndex: detected.associateTurnIndex,
      overallHandling: evaluation.overallHandling,
      stepResults,
      missedStepNumbers: evaluation.missedStepNumbers,
      betterResponseExample: evaluation.betterResponseExample,
      coachingSummary: evaluation.coachingSummary,
    });
  }

  return entries;
}

// Re-export for convenience in tests and downstream consumers
export { parseMomentCoachingEntries };
