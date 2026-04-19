import { z } from 'zod';
import type { Prisma } from '../../../generated/prisma';
import { prisma } from '../../db';
import {
  assertCanConsumeTokens,
  assertCanCreateNewSimulation,
  recordTokenUsage,
} from '../../usage/quotaGuard';
import { assertAndIncrementSimulationCount } from '../../usage/simulationCap';
import { llm } from '../../services/llm';
import { getTopWeaknessesForUser } from '../../services/weaknessProfileService';
import { buildAdaptiveScenarioPlan } from '../../services/adaptiveScenarioPlanService';
import { buildRoleplaySystemPrompt } from '../../services/adaptiveRoleplayPrompt';
import type { AdaptiveScenarioPlan } from '../../schemas/adaptiveScenarioPlan';
import { parseStoredAdaptivePlan } from '../../domain/adaptive/parseStoredAdaptivePlan';
import { buildDrillScenarioPlan } from '../../services/drillScenarioPlanService';
import { parseStoredDrillPlan } from '../../domain/drill/parseStoredDrillPlan';
import type { DrillPlanStored } from '../../schemas/drillPlan';
import type { LiveCoachingSuggestion } from '../../schemas/liveCoaching';
import { getLiveCoachingAfterChatTurn } from '../../services/liveCoachingService';
import { deriveSimulationRealism } from '../../domain/simulationRealism/deriveFromSeed';
import { SalesSkillSchema } from '../../schemas/coaching';
import type { JsonHandlerResult } from '../httpTypes';
import { zodErrorResult } from '../zodHttp';

export const ChatReq = z
  .object({
    conversationId: z.string().optional(),
    personaId: z.string(),
    productId: z.string().optional(),
    userId: z.string().optional(),
    message: z.string().min(1),
    mode: z.enum(['roleplay', 'assistant']).optional(),
    simulationMode: z
      .enum(['generic', 'adaptive', 'drill', 'mixed_practice'])
      .optional()
      .default('generic'),
    primaryDrillSkill: SalesSkillSchema.optional(),
    secondaryDrillSkill: SalesSkillSchema.optional(),
    variantSeed: z.string().optional(),
    liveCoachingEnabled: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.simulationMode === 'drill' && !data.primaryDrillSkill) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'primaryDrillSkill is required when simulationMode is drill',
        path: ['primaryDrillSkill'],
      });
    }
  });

export async function postChat(rawBody: unknown): Promise<JsonHandlerResult> {
  let parsed: z.infer<typeof ChatReq>;
  try {
    parsed = ChatReq.parse(rawBody);
  } catch (e) {
    if (e instanceof z.ZodError) return zodErrorResult(e);
    throw e;
  }

  const {
    conversationId,
    personaId,
    productId,
    userId,
    message,
    mode,
    simulationMode,
    primaryDrillSkill,
    secondaryDrillSkill,
    variantSeed,
    liveCoachingEnabled,
  } = parsed;
  const chatMode = mode ?? 'roleplay';
  const simMode =
    simulationMode === 'adaptive'
      ? 'adaptive'
      : simulationMode === 'drill'
        ? 'drill'
        : simulationMode === 'mixed_practice'
          ? 'mixed_practice'
          : 'generic';

  const persona = await prisma.persona.findUnique({ where: { id: personaId } });
  if (!persona) return { status: 404, body: { error: 'persona not found' } };

  const product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : null;

  let isContinue = false;
  let convo: {
    id: string;
    simulationMode: 'generic' | 'adaptive' | 'drill' | 'mixed_practice';
    adaptiveScenarioPlan: unknown | null;
    drillPlan: unknown | null;
    messages: { role: string; content: string; createdAt: Date }[];
  };

  if (conversationId) {
    const found = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (found) {
      convo = found;
      isContinue = true;
    } else {
      const gate = await assertCanCreateNewSimulation(userId ? { userId } : {});
      if (!gate.ok) return { status: 402, body: gate };
      if (userId) {
        const cap = await assertAndIncrementSimulationCount({ userId });
        if (!cap.ok) return { status: 402, body: cap };
      }
      convo = await prisma.conversation.create({
        data: { personaId, userId: userId ?? null, simulationMode: simMode },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      isContinue = false;
    }
  } else {
    const gate = await assertCanCreateNewSimulation(userId ? { userId } : {});
    if (!gate.ok) return { status: 402, body: gate };
    if (userId) {
      const cap = await assertAndIncrementSimulationCount({ userId });
      if (!cap.ok) return { status: 402, body: cap };
    }
    convo = await prisma.conversation.create({
      data: { personaId, userId: userId ?? null, simulationMode: simMode },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    isContinue = false;
  }

  const productContext = product
    ? `
PRODUCT BEING DISCUSSED:
- Item: ${product.title}
- Brand: ${product.brand || 'Store brand'}
- Price: $${product.price ?? 'Ask associate'}
- Description: ${product.description || 'Fashion apparel item'}
${product.attributes ? `- Details: ${JSON.stringify(product.attributes)}` : ''}
`
    : '';

  const effectiveSimMode = convo.simulationMode;

  let adaptivePlan: AdaptiveScenarioPlan | null = null;
  let drillStoredForResponse: DrillPlanStored | undefined;

  if (chatMode === 'roleplay' && effectiveSimMode === 'adaptive') {
    if (isContinue && convo.adaptiveScenarioPlan != null) {
      adaptivePlan = parseStoredAdaptivePlan(convo.adaptiveScenarioPlan, {
        where: 'POST /chat continue',
        conversationId: convo.id,
      });
    } else if (!isContinue && userId) {
      const weaknesses = await getTopWeaknessesForUser(userId, 3);
      const plan = buildAdaptiveScenarioPlan({
        targetWeaknesses: weaknesses,
        persona: {
          name: persona.name,
          tone: persona.tone,
          instructions: persona.instructions,
        },
        product: product
          ? {
              title: product.title,
              brand: product.brand,
              price: product.price,
              description: product.description,
            }
          : null,
        realismSeed: convo.id,
      });
      if (plan.targetWeaknesses.length > 0) {
        await prisma.conversation.update({
          where: { id: convo.id },
          data: { adaptiveScenarioPlan: plan as unknown as Prisma.InputJsonValue },
        });
        adaptivePlan = plan;
      }
    }
  }

  if (chatMode === 'roleplay' && effectiveSimMode === 'drill') {
    if (isContinue && convo.drillPlan != null) {
      const parsedDrill = parseStoredDrillPlan(convo.drillPlan, {
        where: 'POST /chat continue',
        conversationId: convo.id,
      });
      adaptivePlan = parsedDrill?.promptPlan ?? null;
    } else if (!isContinue && primaryDrillSkill) {
      const seed = variantSeed ?? userId ?? convo.id;
      const { stored, promptPlan } = buildDrillScenarioPlan({
        primarySkill: primaryDrillSkill,
        ...(secondaryDrillSkill ? { secondarySkill: secondaryDrillSkill } : {}),
        persona: {
          name: persona.name,
          tone: persona.tone,
          instructions: persona.instructions,
        },
        product: product
          ? {
              title: product.title,
              brand: product.brand,
              price: product.price,
              description: product.description,
            }
          : null,
        variantSeed: seed,
        realismSeed: convo.id,
      });
      await prisma.conversation.update({
        where: { id: convo.id },
        data: { drillPlan: stored as unknown as Prisma.InputJsonValue },
      });
      drillStoredForResponse = stored;
      adaptivePlan = promptPlan;
    }
  }

  const genericRealismBlock =
    !isContinue && chatMode === 'roleplay' && effectiveSimMode === 'generic'
      ? (() => {
          const r = deriveSimulationRealism(convo.id, persona.name);
          return `

=== REALISM / BUYER PROFILE (stay consistent) ===
Role: ${r.personaTraits.role}
Knowledge level: ${r.buyerKnowledgeLevel}
Behavior pattern: ${r.customerBehavior}
Deal stage: ${r.dealStage}
Communication style: ${r.personaTraits.communicationStyle}
Time pressure: ${r.personaTraits.timePressure}
`;
        })()
      : '';

  const roleplaySystemPromptBase = `You are roleplaying as a customer shopping for APPAREL AND FASHION items in a retail clothing store.

YOUR PERSONA: ${persona.name}

PERSONA BEHAVIOR & TRAITS:
${persona.instructions}

${productContext}

CRITICAL RULES - FOLLOW STRICTLY:
1. You are shopping for CLOTHING, SHOES, ACCESSORIES, or FASHION items ONLY.
2. Stay 100% in character as ${persona.name} - a customer in a clothing/fashion store.
3. NEVER break character or acknowledge you are AI.
4. NEVER discuss topics outside of fashion/apparel shopping (no tech, cars, appliances, etc.)
5. If the associate mentions non-fashion items, gently redirect: "I'm just here looking at clothes today."
6. React naturally: ask about fit, sizing, materials, colors, styling, care instructions.
7. Express preferences about style, comfort, occasions, wardrobe needs.
8. Raise realistic objections about price, quality, fit, or whether you need the item.
9. Keep responses conversational and brief (1-4 sentences).

FASHION-SPECIFIC BEHAVIORS:
- Ask about available sizes, colors, or patterns
- Inquire about fabric/material quality and care
- Consider how items fit your wardrobe or lifestyle
- Think about occasions: work, casual, formal, athletic
- React to price based on your persona's values${genericRealismBlock}`;

  const roleplaySystemPrompt = buildRoleplaySystemPrompt({
    baseFashionBlock: roleplaySystemPromptBase,
    plan: adaptivePlan,
    practiceKind: effectiveSimMode === 'drill' ? 'drill' : 'adaptive',
  });

  const assistantSystemPrompt = `You are a helpful sales training assistant for APPAREL AND FASHION retail.

Help the sales associate practice selling clothing, shoes, and accessories. Provide tips on:
- Building rapport with fashion customers
- Asking discovery questions about style preferences
- Suggesting complementary items and outfits
- Handling common objections (price, fit, necessity)
- Closing techniques for fashion retail

Keep advice practical and specific to clothing/fashion sales.`;

  const systemContent = chatMode === 'roleplay' ? roleplaySystemPrompt : assistantSystemPrompt;

  const history = [
    { role: 'system' as const, content: systemContent },
    ...convo.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const tokenGate = await assertCanConsumeTokens(userId ? { userId, estimatedTokens: 0 } : { estimatedTokens: 0 });
  if (!tokenGate.ok) return { status: 402, body: tokenGate };

  const { content: reply, usage } = await llm.chatWithUsage(history);
  if (userId) {
    await recordTokenUsage({ userId, tokens: usage.totalTokens });
  }

  await prisma.message.createMany({
    data: [
      { conversationId: convo.id, role: 'user', content: message },
      { conversationId: convo.id, role: 'assistant', content: reply },
    ],
  });

  let liveCoaching: LiveCoachingSuggestion | null | undefined;
  if (liveCoachingEnabled && chatMode === 'roleplay') {
    liveCoaching = await getLiveCoachingAfterChatTurn({
      conversationId: convo.id,
      userId,
      liveCoachingEnabled: true,
      chatMode,
    });
  }

  const responseBody: {
    conversationId: string;
    reply: string;
    adaptiveScenario?: AdaptiveScenarioPlan;
    drillPlan?: DrillPlanStored;
    liveCoaching?: LiveCoachingSuggestion | null;
  } = { conversationId: convo.id, reply };
  if (!isContinue && adaptivePlan && chatMode === 'roleplay' && effectiveSimMode === 'adaptive') {
    responseBody.adaptiveScenario = adaptivePlan;
  }
  if (!isContinue && chatMode === 'roleplay' && effectiveSimMode === 'drill' && drillStoredForResponse) {
    responseBody.drillPlan = drillStoredForResponse;
  }
  if (liveCoachingEnabled && chatMode === 'roleplay') {
    responseBody.liveCoaching = liveCoaching ?? null;
  }
  return { status: 200, body: responseBody };
}
