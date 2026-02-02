import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma';
import { llm } from './services/llm';

const prisma = new PrismaClient();
const app = express();

// Optional request logging (won't crash if morgan isn't installed)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const morgan = require('morgan');
  app.use(morgan('dev'));
} catch {
  // no-op
}

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// ===========================================
// UTILITY
// ===========================================

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ===========================================
// HEALTH & BASIC ROUTES
// ===========================================

app.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: 'connected', timestamp: new Date().toISOString() });
    } catch {
      res.status(500).json({ ok: false, db: 'disconnected' });
    }
  })
);

app.get('/ping', (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get(
  '/personas',
  asyncHandler(async (_req: Request, res: Response) => {
    const personas = await prisma.persona.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const transformed = personas.map((p) => ({
      id: p.id,
      name: p.name,
      tone: p.tone,
      values: p.values,
      instructions: p.instructions,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    res.json({ ok: true, personas: transformed, data: transformed });
  })
);

// Products endpoint - maps 'title' to 'name' for frontend compatibility
app.get(
  '/products',
  asyncHandler(async (_req: Request, res: Response) => {
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
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    res.json({ ok: true, products: transformed, data: transformed });
  })
);

// ===========================================
// CONVERSATIONS
// ===========================================

app.get(
  '/conversations',
  asyncHandler(async (_req: Request, res: Response) => {
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
        role: m.role as 'user' | 'assistant',
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

    res.json({ ok: true, conversations: transformed, data: transformed });
  })
);

// ===========================================
// CHAT - Fixed persona drift for apparel/fashion
// ===========================================

const ChatReq = z.object({
  conversationId: z.string().optional(),
  personaId: z.string(),
  productId: z.string().optional(),
  message: z.string().min(1),
  mode: z.enum(['roleplay', 'assistant']).optional(),
});

app.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, personaId, productId, message, mode } = ChatReq.parse(
      req.body
    );
    const chatMode = mode ?? 'roleplay';

    const persona = await prisma.persona.findUnique({ where: { id: personaId } });
    if (!persona) return res.status(404).json({ error: 'persona not found' });

    // Load product if specified
    const product = productId
      ? await prisma.product.findUnique({ where: { id: productId } })
      : null;

    // Get or create conversation
    let convo: {
      id: string;
      messages: { role: string; content: string; createdAt: Date }[];
    };

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
    } else {
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

    const systemContent =
      chatMode === 'roleplay' ? roleplaySystemPrompt : assistantSystemPrompt;

    const history = [
      { role: 'system' as const, content: systemContent },
      ...convo.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const reply = await llm.chat(history);

    await prisma.message.createMany({
      data: [
        { conversationId: convo.id, role: 'user', content: message },
        { conversationId: convo.id, role: 'assistant', content: reply },
      ],
    });

    res.json({ conversationId: convo.id, reply });
  })
);

// ===========================================
// FEEDBACK
// ===========================================

const FeedbackReq = z.object({ conversationId: z.string() });

app.post(
  '/feedback',
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = FeedbackReq.parse(req.body);

    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, persona: true },
    });

    if (!convo) return res.status(404).json({ error: 'conversation not found' });

    const transcript = convo.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const evalJson = await llm.judge({
      rubric: `Evaluate this FASHION/APPAREL sales conversation. Score 0-10 for each category.`,
      transcript,
      persona: convo.persona?.name ?? '',
    });

    const EvalSchema = z.object({
      storytelling: z.number().min(0).max(10),
      emotional: z.number().min(0).max(10),
      persuasion: z.number().min(0).max(10),
      productKnow: z.number().min(0).max(10),
      total: z.number().min(0).max(40),
      strengths: z.string(),
      tips: z.string(),
    });

    const parsed = EvalSchema.parse(evalJson);

    const saved = await prisma.evaluation.upsert({
      where: { conversationId },
      update: parsed,
      create: { conversationId, ...parsed },
    });

    res.json(saved);
  })
);

// ===========================================
// SCRIPT GENERATION - Fixed JSON shape
// ===========================================

const GenReq = z.object({
  productId: z.string(),
  personaId: z.string().optional(),
  tone: z.string().optional(),
});

app.post(
  '/generate-script',
  asyncHandler(async (req: Request, res: Response) => {
    const { productId, personaId, tone } = GenReq.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'product not found' });

    const persona = personaId
      ? await prisma.persona.findUnique({ where: { id: personaId } })
      : null;

    const cacheKey = `${product.id}:${persona?.id ?? 'none'}:${tone ?? 'neutral'}`;

    // Check cache
    const existing = await prisma.script.findUnique({ where: { cacheKey } });
    if (existing) {
      const content: any = existing.content;
      return res.json({
        id: existing.id,
        steps: formatScriptToString(content),
        script: formatScriptToString(content),
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

${
  persona
    ? `CUSTOMER TYPE: ${persona.name}\n${persona.instructions}`
    : 'CUSTOMER: General fashion shopper'
}

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

    const scriptResponse = await llm.chat([
      {
        role: 'system',
        content:
          'You are a fashion retail sales training expert. Generate practical, conversational scripts for clothing store associates.',
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
      script: scriptResponse,
      personaId: saved.personaId,
      productId: saved.productId,
      tone: saved.tone,
    });
  })
);

function formatScriptToString(content: any): string {
  if (typeof content === 'string') return content;
  if (content?.script) {
    if (typeof content.script === 'string') return content.script;
    if (Array.isArray(content.script)) return content.script.join('\n\n');
  }
  if (Array.isArray(content)) return content.join('\n\n');
  return JSON.stringify(content, null, 2);
}

// ===========================================
// TEST ENDPOINTS
// ===========================================

app.get(
  '/test-llm',
  asyncHandler(async (_req: Request, res: Response) => {
    const response = await llm.chat([{ role: 'user', content: 'Say hello! This is a test.' }]);
    res.json({ ok: true, response });
  })
);

// ===========================================
// ERROR HANDLING
// ===========================================

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
