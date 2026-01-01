import 'dotenv/config';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma';
import { llm } from './services/llm';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// Health
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

// List Personas
app.get('/personas', async (_req: Request, res: Response) => {
  const personas = await prisma.persona.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      tone: true,
      values: true,
      instructions: true,
      createdAt: true,
    },
  });

  res.json({ ok: true, personas });
});

// List Products
app.get('/products', async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      sku: true,
      title: true,
      description: true,
      brand: true,
      attributes: true,
      price: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ ok: true, products });
});

// Test LLM
app.get('/test-llm', async (_req: Request, res: Response) => {
  try {
    const response = await llm.chat([
      { role: 'user', content: 'Say hello! This is a test from /test-llm.' }
    ]);

    res.json({ ok: true, response });
  } catch (err) {
    console.error('LLM ERROR:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Test generateScript
app.get("/test-generate-script", async (req, res) => {
  try {
    const script = await llm.generateScript({
      product: {
        brand: "Nike",
        attributes: {
          material: "breathable Flyknit",
        }
      },
      persona: { name: "Trend-Seeking Shopper" },
      tone: "hype",
      steps: 4
    });

    return res.json({ ok: true, script });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// --- /chat ---
const ChatReq = z.object({
  conversationId: z.string().optional(),
  personaId: z.string(),
  message: z.string().min(1),
  mode: z.enum(['roleplay', 'assistant']).optional()
});
app.post('/chat', async (req: Request, res: Response) => {
  const { conversationId, personaId, message, mode } = ChatReq.parse(req.body);
  const chatMode = mode ?? 'roleplay';

  const persona = await prisma.persona.findUnique({ where: { id: personaId }});
  if (!persona) return res.status(404).json({ error: 'persona not found' });

  let convo = null as unknown as { id: string; messages: { role: string; content: string }[] };

  if (conversationId) {
    const found = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (found) {
      convo = found;
    } else {
      // create a new conversation if the provided ID doesn't exist
      convo = await prisma.conversation.create({
        data: { personaId },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });
    }
  } else {
    // no conversationId provided; start a new conversation
    convo = await prisma.conversation.create({
      data: { personaId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }

  const roleplaySystemPrompt = `You are roleplaying as a customer with the following persona: ${persona.name}.

Persona details (traits, preferences, and buying triggers):
${persona.instructions}

The user is a sales associate trying to sell you a product.

Rules:
- Respond ONLY as the customer.
- Be realistic: ask clarifying questions, express preferences, and raise objections.
- Do not write sales copy or narrate the scene.
- Keep responses concise (1–5 sentences) unless the associate asks for more detail.`;

  const systemContent = chatMode === 'roleplay' ? roleplaySystemPrompt : persona.instructions;

  const history = [
    { role: 'system' as const, content: systemContent },
    ...convo.messages.map(m => ({ role: m.role as 'user'|'assistant'|'system', content: m.content })),
    { role: 'user' as const, content: message }
  ];

  const reply = await llm.chat(history);

  await prisma.message.createMany({
    data: [
      { conversationId: convo.id, role: 'user', content: message },
      { conversationId: convo.id, role: 'assistant', content: reply }
    ]
  });

  res.json({ conversationId: convo.id, reply });
});

// --- /feedback ---
const FeedbackReq = z.object({ conversationId: z.string() });
app.post('/feedback', async (req: Request, res: Response) => {
  const { conversationId } = FeedbackReq.parse(req.body);
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } }, persona: true }
  });
  if (!convo) return res.status(404).json({ error: 'conversation not found' });

  const transcript = convo.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const evalJson = await llm.judge({
    rubric: `Score 0-10 for storytelling, emotional connection, persuasion, product knowledge. Return JSON.`,
    transcript,
    persona: convo.persona?.name ?? ''
  });

  const Eval = z.object({
    storytelling: z.number().int().min(0).max(10),
    emotional: z.number().int().min(0).max(10),
    persuasion: z.number().int().min(0).max(10),
    productKnow: z.number().int().min(0).max(10),
    total: z.number().int().min(0).max(40),
    strengths: z.string(),
    tips: z.string()
  });
  const parsed = Eval.parse(evalJson);

  const saved = await prisma.evaluation.upsert({
    where: { conversationId },
    update: parsed,
    create: { conversationId, ...parsed }
  });

  res.json(saved);
});

// --- /generate-script ---
const GenReq = z.object({
  productId: z.string(),
  personaId: z.string().optional(),
  tone: z.string().optional()
});
app.post('/generate-script', async (req: Request, res: Response) => {
  const { productId, personaId, tone } = GenReq.parse(req.body);

  const product = await prisma.product.findUnique({ where: { id: productId }});
  if (!product) return res.status(404).json({ error: 'product not found' });

  const persona = personaId ? await prisma.persona.findUnique({ where: { id: personaId }}) : null;

  const cacheKey = `${product.id}:${persona?.id ?? 'none'}:${tone ?? 'neutral'}`;
  const existing = await prisma.script.findUnique({ where: { cacheKey }});
  if (existing) return res.json(existing.content);

  const scriptJson = await llm.generateScript({
    product,
    persona,
    tone: tone ?? 'neutral',
    steps: 4
  });

  const ScriptSchema = z.object({
    persona: z.string(),
    script: z.array(z.string()).min(3).max(6)
  });
  const valid = ScriptSchema.parse(scriptJson);

  const saved = await prisma.script.create({
    data: {
      productId: product.id,
      personaId: persona?.id ?? null,
      tone: tone ?? null,
      content: valid,
      cacheKey
    }
  });

  res.json(saved.content);
});

app.listen(3001, () => console.log('API on :3001'));