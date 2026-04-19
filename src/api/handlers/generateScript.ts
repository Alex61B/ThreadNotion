import { z } from 'zod';
import { prisma } from '../../db';
import { assertCanConsumeTokens, recordTokenUsage } from '../../usage/quotaGuard';
import { llm } from '../../services/llm';
import type { JsonHandlerResult } from '../httpTypes';
import { zodErrorResult } from '../zodHttp';

const GenReq = z.object({
  productId: z.string(),
  personaId: z.string().optional(),
  tone: z.string().optional(),
});

function formatScriptToString(content: unknown): string {
  if (typeof content === 'string') return content;
  const c = content as Record<string, unknown> | null;
  if (c?.script) {
    if (typeof c.script === 'string') return c.script;
    if (Array.isArray(c.script)) return c.script.join('\n\n');
  }
  if (Array.isArray(content)) return content.join('\n\n');
  return JSON.stringify(content, null, 2);
}

export async function postGenerateScript(
  rawBody: unknown,
  userId: string | undefined
): Promise<JsonHandlerResult> {
  let parsed: z.infer<typeof GenReq>;
  try {
    parsed = GenReq.parse(rawBody);
  } catch (e) {
    if (e instanceof z.ZodError) return zodErrorResult(e);
    throw e;
  }
  const { productId, personaId, tone } = parsed;

  const tokenGate = await assertCanConsumeTokens(userId ? { userId, estimatedTokens: 0 } : { estimatedTokens: 0 });
  if (!tokenGate.ok) return { status: 402, body: tokenGate };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { status: 404, body: { error: 'product not found' } };

  const persona = personaId ? await prisma.persona.findUnique({ where: { id: personaId } }) : null;

  const cacheKey = `${product.id}:${persona?.id ?? 'none'}:${tone ?? 'neutral'}`;

  const existing = await prisma.script.findUnique({ where: { cacheKey } });
  if (existing) {
    const content: unknown = existing.content;
    return {
      status: 200,
      body: {
        id: existing.id,
        steps: formatScriptToString(content),
        script: formatScriptToString(content),
        personaId: existing.personaId,
        productId: existing.productId,
        tone: existing.tone,
      },
    };
  }

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

  const { content: scriptResponse, usage } = await llm.chatWithUsage([
    {
      role: 'system',
      content:
        'You are a fashion retail sales training expert. Generate practical, conversational scripts for clothing store associates.',
    },
    { role: 'user', content: scriptPrompt },
  ]);
  if (userId) {
    await recordTokenUsage({ userId, tokens: usage.totalTokens });
  }

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

  return {
    status: 200,
    body: {
      id: saved.id,
      steps: scriptResponse,
      script: scriptResponse,
      personaId: saved.personaId,
      productId: saved.productId,
      tone: saved.tone,
    },
  };
}
