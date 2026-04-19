import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const hoisted = vi.hoisted(() => ({
  llmChatWithUsage: vi.fn().mockResolvedValue({
    content: 'reply',
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
  }),
  personaFindUnique: vi.fn(),
  productFindUnique: vi.fn(),
  convFindUnique: vi.fn(),
  convCreate: vi.fn(),
  messageCreateMany: vi.fn(),
  entitlementFindUnique: vi.fn(),
  tokenUsageFindUnique: vi.fn(),
  tokenUsageUpsert: vi.fn(),
  conversationCount: vi.fn(),
  simUsageUpsert: vi.fn(),
  simUsageUpdate: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('./services/llm', () => ({
  llm: {
    chat: vi.fn(),
    chatWithUsage: hoisted.llmChatWithUsage,
    evaluateSalesSkills: vi.fn(),
    judge: vi.fn(),
    generateScript: vi.fn(),
  },
}));

vi.mock('./db', () => {
  const prismaMock: any = {
    persona: { findUnique: hoisted.personaFindUnique },
    product: { findUnique: hoisted.productFindUnique },
    conversation: {
      findUnique: hoisted.convFindUnique,
      create: hoisted.convCreate,
      count: hoisted.conversationCount,
    },
    userSimulationUsage: { upsert: hoisted.simUsageUpsert, update: hoisted.simUsageUpdate },
    $queryRaw: hoisted.queryRaw,
    $transaction: async (fn: any) => fn(prismaMock),
    message: { createMany: hoisted.messageCreateMany },
    entitlement: { findUnique: hoisted.entitlementFindUnique },
    tokenUsageDaily: { findUnique: hoisted.tokenUsageFindUnique, upsert: hoisted.tokenUsageUpsert },
    billingAccount: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn(), update: vi.fn() },
  };
  return { prisma: prismaMock };
});

import { app } from './server';

const basePersona = {
  id: 'p1',
  name: 'Riley',
  tone: null as string | null,
  instructions: 'Practical shopper.',
};

function resetMocks() {
  hoisted.llmChatWithUsage.mockClear();
  hoisted.personaFindUnique.mockResolvedValue(basePersona);
  hoisted.productFindUnique.mockResolvedValue(null);
  hoisted.convFindUnique.mockResolvedValue(null);
  hoisted.convCreate.mockResolvedValue({
    id: 'c1',
    simulationMode: 'generic',
    adaptiveScenarioPlan: null,
    drillPlan: null,
    messages: [],
  });
  hoisted.messageCreateMany.mockResolvedValue({ count: 2 });
  hoisted.tokenUsageUpsert.mockResolvedValue({});
  hoisted.tokenUsageUpsert.mockClear();
  hoisted.simUsageUpsert.mockResolvedValue({});
  hoisted.simUsageUpdate.mockResolvedValue({});
  hoisted.queryRaw.mockResolvedValue([{ userId: 'u1', uniqueSimulationsCount: 0 }]);
}

describe('Phase 2 quota enforcement (individual-only)', () => {
  beforeEach(() => {
    resetMocks();
    hoisted.entitlementFindUnique.mockResolvedValue({
      subjectType: 'USER',
      subjectId: 'u1',
      planType: 'FREE',
      maxSeats: 1,
      dailyTokenLimit: 20,
      freeSimulationLimit: 5,
      updatedAt: new Date(),
    } as any);
    hoisted.tokenUsageFindUnique.mockResolvedValue(null);
    hoisted.conversationCount.mockResolvedValue(0);
  });

  it('allows creating simulations under free cap', async () => {
    hoisted.conversationCount.mockResolvedValue(4);
    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'hi',
      simulationMode: 'generic',
    });
    expect(res.status).toBe(200);
  });

  it('blocks creating simulation when at free cap', async () => {
    hoisted.queryRaw.mockResolvedValue([{ userId: 'u1', uniqueSimulationsCount: 5 }]);
    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'hi',
      simulationMode: 'generic',
    });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PAYWALL_FREE_SIM_LIMIT');
  });

  it('blocks LLM use when daily token cap reached', async () => {
    hoisted.entitlementFindUnique.mockResolvedValue({
      subjectType: 'USER',
      subjectId: 'u1',
      planType: 'INDIVIDUAL',
      maxSeats: 1,
      dailyTokenLimit: 20,
      freeSimulationLimit: 5,
      updatedAt: new Date(),
    } as any);
    hoisted.tokenUsageFindUnique.mockResolvedValue({ tokensUsed: BigInt(20) });
    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'hi',
      simulationMode: 'generic',
    });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('QUOTA_TOKENS_DAILY_EXCEEDED');
  });

  it('records token usage only after successful LLM call', async () => {
    hoisted.llmChatWithUsage.mockResolvedValueOnce({
      content: 'reply',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'hi',
      simulationMode: 'generic',
    });
    expect(res.status).toBe(200);
    expect(hoisted.tokenUsageUpsert).toHaveBeenCalledTimes(1);
  });
});

