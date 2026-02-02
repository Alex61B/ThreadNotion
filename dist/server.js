"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const prisma_1 = require("../generated/prisma");
const llm_1 = require("./services/llm");
const prisma = new prisma_1.PrismaClient();
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
// ===========================================
// UTILITY
// ===========================================
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// ===========================================
// HEALTH & BASIC ROUTES
// ===========================================
app.get('/health', asyncHandler(async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.json({ ok: true, db: 'connected', timestamp: new Date().toISOString() });
    }
    catch {
        res.status(500).json({ ok: false, db: 'disconnected' });
    }
}));
app.get('/personas', asyncHandler(async (_req, res) => {
    const personas = await prisma.persona.findMany({
        orderBy: { createdAt: 'desc' },
    });
    res.json({ ok: true, personas });
}));
// Products endpoint - maps 'title' to 'name' for frontend compatibility
app.get('/products', asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
    });
    const transformed = products.map((p) => ({
        id: p.id,
        name: p.title,
        title: p.title,
        description: p.description,
        brand: p.brand,
        price: p.price,
        currency: p.currency,
        sku: p.sku,
        attributes: p.attributes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    }));
    res.json({ ok: true, products: transformed });
}));
// ===========================================
// CONVERSATIONS
// ===========================================
app.get('/conversations', asyncHandler(async (_req, res) => {
    const conversations = await prisma.conversation.findMany({
        include: {
            messages: { orderBy: { createdAt: 'asc' } },
            persona: true,
            evaluation: true,
        },
        orderBy: { createdAt: 'desc' },
    });
    // Ensure consistent shape for frontend
    const transformed = conversations.map((conv) => ({
        id: conv.id,
        personaId: conv.personaId,
        createdAt: conv.createdAt.toISOString(),
        persona: conv.persona
            ? {
                id: conv.persona.id,
                name: conv.persona.name,
                tone: conv.persona.tone,
            }
            : null,
        messages: conv.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
        })),
        evaluation: conv.evaluation
            ? {
                id: conv.evaluation.id,
                conversationId: conv.evaluation.conversationId,
                storytelling: conv.evaluation.storytelling,
                emotional: conv.evaluation.emotional,
                persuasion: conv.evaluation.persuasion,
                productKnow: conv.evaluation.productKnow,
                total: conv.evaluation.total,
                strengths: conv.evaluation.strengths,
                tips: conv.evaluation.tips,
                createdAt: conv.evaluation.createdAt.toISOString(),
            }
            : null,
    }));
    res.json({ ok: true, conversations: transformed });
}));
// ===========================================
// CHAT - Fixed persona drift for apparel/fashion
// ===========================================
const ChatReq = zod_1.z.object({
    conversationId: zod_1.z.string().optional(),
    personaId: zod_1.z.string(),
    productId: zod_1.z.string().optional(),
    message: zod_1.z.string().min(1),
    mode: zod_1.z.enum(['roleplay', 'assistant']).optional(),
});
app.post('/chat', asyncHandler(async (req, res) => {
    const { conversationId, personaId, productId, message, mode } = ChatReq.parse(req.body);
    const chatMode = mode ?? 'roleplay';
    const persona = await prisma.persona.findUnique({ where: { id: personaId } });
    if (!persona)
        return res.status(404).json({ error: 'persona not found' });
    // Load product if specified
    const product = productId
        ? await prisma.product.findUnique({ where: { id: productId } })
        : null;
    // Get or create conversation
    let convo;
    if (conversationId) {
        const found = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        convo =
            found ??
                (await prisma.conversation.create({
                    data: { personaId },
                    include: { messages: { orderBy: { createdAt: 'asc' } } },
                }));
    }
    else {
        convo = await prisma.conversation.create({
            data: { personaId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
    }
    // Build product context for apparel/fashion
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
    // Stronger domain anchoring to prevent persona drift
    const roleplaySystemPrompt = `You are roleplaying as a customer shopping for APPAREL AND FASHION items in a retail clothing store.

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
- React to price based on your persona's values`;
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
    const reply = await llm_1.llm.chat(history);
    await prisma.message.createMany({
        data: [
            { conversationId: convo.id, role: 'user', content: message },
            { conversationId: convo.id, role: 'assistant', content: reply },
        ],
    });
    res.json({ conversationId: convo.id, reply });
}));
// ===========================================
// FEEDBACK
// ===========================================
const FeedbackReq = zod_1.z.object({ conversationId: zod_1.z.string() });
app.post('/feedback', asyncHandler(async (req, res) => {
    const { conversationId } = FeedbackReq.parse(req.body);
    const convo = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } }, persona: true },
    });
    if (!convo)
        return res.status(404).json({ error: 'conversation not found' });
    const transcript = convo.messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');
    const evalJson = await llm_1.llm.judge({
        rubric: `Evaluate this FASHION/APPAREL sales conversation. Score 0-10 for each category.`,
        transcript,
        persona: convo.persona?.name ?? '',
    });
    const EvalSchema = zod_1.z.object({
        storytelling: zod_1.z.number().min(0).max(10),
        emotional: zod_1.z.number().min(0).max(10),
        persuasion: zod_1.z.number().min(0).max(10),
        productKnow: zod_1.z.number().min(0).max(10),
        total: zod_1.z.number().min(0).max(40),
        strengths: zod_1.z.string(),
        tips: zod_1.z.string(),
    });
    const parsed = EvalSchema.parse(evalJson);
    const saved = await prisma.evaluation.upsert({
        where: { conversationId },
        update: parsed,
        create: { conversationId, ...parsed },
    });
    res.json(saved);
}));
// ===========================================
// SCRIPT GENERATION - Fixed JSON shape
// ===========================================
const GenReq = zod_1.z.object({
    productId: zod_1.z.string(),
    personaId: zod_1.z.string().optional(),
    tone: zod_1.z.string().optional(),
});
app.post('/generate-script', asyncHandler(async (req, res) => {
    const { productId, personaId, tone } = GenReq.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product)
        return res.status(404).json({ error: 'product not found' });
    const persona = personaId
        ? await prisma.persona.findUnique({ where: { id: personaId } })
        : null;
    const cacheKey = `${product.id}:${persona?.id ?? 'none'}:${tone ?? 'neutral'}`;
    // Check cache
    const existing = await prisma.script.findUnique({ where: { cacheKey } });
    if (existing) {
        const content = existing.content;
        return res.json({
            id: existing.id,
            steps: formatScriptToString(content),
            personaId: existing.personaId,
            productId: existing.productId,
            tone: existing.tone,
        });
    }
    // Generate new script with structured sections for fashion retail
    const scriptPrompt = `Create a sales script for a FASHION/APPAREL retail associate.

PRODUCT:
- Item: ${product.title}
- Brand: ${product.brand || 'Store brand'}
- Price: $${product.price ?? 'TBD'}
- Description: ${product.description || 'Fashion item'}
${product.attributes ? `- Details: ${JSON.stringify(product.attributes)}` : ''}

${persona
        ? `CUSTOMER TYPE: ${persona.name}\n${persona.instructions}`
        : 'CUSTOMER: General fashion shopper'}

TONE: ${tone || 'neutral'}

Generate a complete sales script with these EXACT sections (use these exact headers):

Opening
---------
[2-3 greeting options and how to approach the customer]

Discovery Questions
---------
[4-5 questions to understand their needs, style, occasion, preferences]

Product Pitch
---------
[How to present the product's benefits, features, styling suggestions]

Objection Handling
---------
[3-4 common objections with suggested responses]

Close
---------
[2-3 ways to guide toward purchase, suggest add-ons]

Write naturally, as a real associate would speak. Focus on fashion-specific language (fit, style, versatility, quality, comfort).`;
    const scriptResponse = await llm_1.llm.chat([
        {
            role: 'system',
            content: 'You are a fashion retail sales training expert. Generate practical, conversational scripts for clothing store associates.',
        },
        { role: 'user', content: scriptPrompt },
    ]);
    const scriptContent = {
        persona: persona?.name || 'General',
        script: scriptResponse,
        tone: tone || 'neutral',
        productId: product.id,
        generatedAt: new Date().toISOString(),
    };
    const saved = await prisma.script.create({
        data: {
            productId: product.id,
            personaId: persona?.id ?? null,
            tone: tone ?? null,
            content: scriptContent,
            cacheKey,
        },
    });
    res.json({
        id: saved.id,
        steps: scriptResponse,
        personaId: saved.personaId,
        productId: saved.productId,
        tone: saved.tone,
    });
}));
function formatScriptToString(content) {
    if (typeof content === 'string')
        return content;
    if (content?.script) {
        if (typeof content.script === 'string')
            return content.script;
        if (Array.isArray(content.script))
            return content.script.join('\n\n');
    }
    if (Array.isArray(content))
        return content.join('\n\n');
    return JSON.stringify(content, null, 2);
}
// ===========================================
// TEST ENDPOINTS
// ===========================================
app.get('/test-llm', asyncHandler(async (_req, res) => {
    const response = await llm_1.llm.chat([{ role: 'user', content: 'Say hello! This is a test.' }]);
    res.json({ ok: true, response });
}));
// ===========================================
// ERROR HANDLING
// ===========================================
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// ===========================================
// START
// ===========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 ThreadNotion API on port ${PORT}`);
});
//# sourceMappingURL=server.js.map