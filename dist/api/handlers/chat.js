"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatReq = void 0;
exports.postChat = postChat;
const zod_1 = require("zod");
const db_1 = require("../../db");
const quotaGuard_1 = require("../../usage/quotaGuard");
const simulationCap_1 = require("../../usage/simulationCap");
const llm_1 = require("../../services/llm");
const weaknessProfileService_1 = require("../../services/weaknessProfileService");
const adaptiveScenarioPlanService_1 = require("../../services/adaptiveScenarioPlanService");
const adaptiveRoleplayPrompt_1 = require("../../services/adaptiveRoleplayPrompt");
const parseStoredAdaptivePlan_1 = require("../../domain/adaptive/parseStoredAdaptivePlan");
const drillScenarioPlanService_1 = require("../../services/drillScenarioPlanService");
const parseStoredDrillPlan_1 = require("../../domain/drill/parseStoredDrillPlan");
const liveCoachingService_1 = require("../../services/liveCoachingService");
const deriveFromSeed_1 = require("../../domain/simulationRealism/deriveFromSeed");
const coaching_1 = require("../../schemas/coaching");
const zodHttp_1 = require("../zodHttp");
exports.ChatReq = zod_1.z
    .object({
    conversationId: zod_1.z.string().optional(),
    personaId: zod_1.z.string(),
    productId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    message: zod_1.z.string().min(1),
    mode: zod_1.z.enum(['roleplay', 'assistant']).optional(),
    simulationMode: zod_1.z
        .enum(['generic', 'adaptive', 'drill', 'mixed_practice'])
        .optional()
        .default('generic'),
    primaryDrillSkill: coaching_1.SalesSkillSchema.optional(),
    secondaryDrillSkill: coaching_1.SalesSkillSchema.optional(),
    variantSeed: zod_1.z.string().optional(),
    liveCoachingEnabled: zod_1.z.boolean().optional().default(false),
})
    .superRefine((data, ctx) => {
    if (data.simulationMode === 'drill' && !data.primaryDrillSkill) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'primaryDrillSkill is required when simulationMode is drill',
            path: ['primaryDrillSkill'],
        });
    }
});
async function postChat(rawBody) {
    let parsed;
    try {
        parsed = exports.ChatReq.parse(rawBody);
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError)
            return (0, zodHttp_1.zodErrorResult)(e);
        throw e;
    }
    const { conversationId, personaId, productId, userId, message, mode, simulationMode, primaryDrillSkill, secondaryDrillSkill, variantSeed, liveCoachingEnabled, } = parsed;
    const chatMode = mode ?? 'roleplay';
    const simMode = simulationMode === 'adaptive'
        ? 'adaptive'
        : simulationMode === 'drill'
            ? 'drill'
            : simulationMode === 'mixed_practice'
                ? 'mixed_practice'
                : 'generic';
    const persona = await db_1.prisma.persona.findUnique({ where: { id: personaId } });
    if (!persona)
        return { status: 404, body: { error: 'persona not found' } };
    const product = productId ? await db_1.prisma.product.findUnique({ where: { id: productId } }) : null;
    let isContinue = false;
    let convo;
    if (conversationId) {
        const found = await db_1.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (found) {
            convo = found;
            isContinue = true;
        }
        else {
            const gate = await (0, quotaGuard_1.assertCanCreateNewSimulation)(userId ? { userId } : {});
            if (!gate.ok)
                return { status: 402, body: gate };
            if (userId) {
                const cap = await (0, simulationCap_1.assertAndIncrementSimulationCount)({ userId });
                if (!cap.ok)
                    return { status: 402, body: cap };
            }
            convo = await db_1.prisma.conversation.create({
                data: { personaId, userId: userId ?? null, simulationMode: simMode },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
            });
            isContinue = false;
        }
    }
    else {
        const gate = await (0, quotaGuard_1.assertCanCreateNewSimulation)(userId ? { userId } : {});
        if (!gate.ok)
            return { status: 402, body: gate };
        if (userId) {
            const cap = await (0, simulationCap_1.assertAndIncrementSimulationCount)({ userId });
            if (!cap.ok)
                return { status: 402, body: cap };
        }
        convo = await db_1.prisma.conversation.create({
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
    let adaptivePlan = null;
    let drillStoredForResponse;
    if (chatMode === 'roleplay' && effectiveSimMode === 'adaptive') {
        if (isContinue && convo.adaptiveScenarioPlan != null) {
            adaptivePlan = (0, parseStoredAdaptivePlan_1.parseStoredAdaptivePlan)(convo.adaptiveScenarioPlan, {
                where: 'POST /chat continue',
                conversationId: convo.id,
            });
        }
        else if (!isContinue && userId) {
            const weaknesses = await (0, weaknessProfileService_1.getTopWeaknessesForUser)(userId, 3);
            const plan = (0, adaptiveScenarioPlanService_1.buildAdaptiveScenarioPlan)({
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
                await db_1.prisma.conversation.update({
                    where: { id: convo.id },
                    data: { adaptiveScenarioPlan: plan },
                });
                adaptivePlan = plan;
            }
        }
    }
    if (chatMode === 'roleplay' && effectiveSimMode === 'drill') {
        if (isContinue && convo.drillPlan != null) {
            const parsedDrill = (0, parseStoredDrillPlan_1.parseStoredDrillPlan)(convo.drillPlan, {
                where: 'POST /chat continue',
                conversationId: convo.id,
            });
            adaptivePlan = parsedDrill?.promptPlan ?? null;
        }
        else if (!isContinue && primaryDrillSkill) {
            const seed = variantSeed ?? userId ?? convo.id;
            const { stored, promptPlan } = (0, drillScenarioPlanService_1.buildDrillScenarioPlan)({
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
            await db_1.prisma.conversation.update({
                where: { id: convo.id },
                data: { drillPlan: stored },
            });
            drillStoredForResponse = stored;
            adaptivePlan = promptPlan;
        }
    }
    const genericRealismBlock = !isContinue && chatMode === 'roleplay' && effectiveSimMode === 'generic'
        ? (() => {
            const r = (0, deriveFromSeed_1.deriveSimulationRealism)(convo.id, persona.name);
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
    const roleplaySystemPrompt = (0, adaptiveRoleplayPrompt_1.buildRoleplaySystemPrompt)({
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
        { role: 'system', content: systemContent },
        ...convo.messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        { role: 'user', content: message },
    ];
    const tokenGate = await (0, quotaGuard_1.assertCanConsumeTokens)(userId ? { userId, estimatedTokens: 0 } : { estimatedTokens: 0 });
    if (!tokenGate.ok)
        return { status: 402, body: tokenGate };
    const { content: reply, usage } = await llm_1.llm.chatWithUsage(history);
    if (userId) {
        await (0, quotaGuard_1.recordTokenUsage)({ userId, tokens: usage.totalTokens });
    }
    await db_1.prisma.message.createMany({
        data: [
            { conversationId: convo.id, role: 'user', content: message },
            { conversationId: convo.id, role: 'assistant', content: reply },
        ],
    });
    let liveCoaching;
    if (liveCoachingEnabled && chatMode === 'roleplay') {
        liveCoaching = await (0, liveCoachingService_1.getLiveCoachingAfterChatTurn)({
            conversationId: convo.id,
            userId,
            liveCoachingEnabled: true,
            chatMode,
        });
    }
    const responseBody = { conversationId: convo.id, reply };
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
//# sourceMappingURL=chat.js.map