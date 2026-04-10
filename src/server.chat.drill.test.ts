import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { buildDrillScenarioPlan } from './services/drillScenarioPlanService';

const hoisted = vi.hoisted(() => ({
  llmChat: vi.fn().mockResolvedValue('Customer reply'),
  getTopWeaknessesForUser: vi.fn(),
  personaFindUnique: vi.fn(),
  productFindUnique: vi.fn(),
  convFindUnique: vi.fn(),
  convCreate: vi.fn(),
  convUpdate: vi.fn(),
  messageCreateMany: vi.fn(),
}));

vi.mock('./services/llm', () => ({
  llm: {
    chat: hoisted.llmChat,
    evaluateSalesSkills: vi.fn(),
    judge: vi.fn(),
    generateScript: vi.fn(),
  },
}));

vi.mock('./services/weaknessProfileService', () => ({
  getTopWeaknessesForUser: hoisted.getTopWeaknessesForUser,
  listWeaknessProfilesForUser: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    persona: { findUnique: hoisted.personaFindUnique },
    product: { findUnique: hoisted.productFindUnique },
    conversation: {
      findUnique: hoisted.convFindUnique,
      create: hoisted.convCreate,
      update: hoisted.convUpdate,
    },
    message: { createMany: hoisted.messageCreateMany },
  },
}));

import { app } from './server';

const basePersona = {
  id: 'p1',
  name: 'Riley',
  tone: null as string | null,
  instructions: 'Practical shopper.',
};

function resetMocks() {
  hoisted.llmChat.mockClear();
  hoisted.getTopWeaknessesForUser.mockReset();
  hoisted.convFindUnique.mockReset();
  hoisted.convCreate.mockReset();
  hoisted.convUpdate.mockReset();
  hoisted.personaFindUnique.mockResolvedValue(basePersona);
  hoisted.productFindUnique.mockResolvedValue(null);
  hoisted.messageCreateMany.mockResolvedValue({ count: 2 });
}

describe('POST /chat drill mode', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('rejects drill without primaryDrillSkill', async () => {
    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'Hello',
      mode: 'roleplay',
      simulationMode: 'drill',
    });
    expect(res.status).toBe(400);
  });

  it('new drill: persists drillPlan and returns drillPlan in response', async () => {
    hoisted.convCreate.mockResolvedValue({
      id: 'drill1',
      personaId: 'p1',
      userId: 'u1',
      simulationMode: 'drill',
      adaptiveScenarioPlan: null,
      drillPlan: null,
      messages: [],
    });
    hoisted.convUpdate.mockResolvedValue({});

    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'Hello',
      mode: 'roleplay',
      simulationMode: 'drill',
      primaryDrillSkill: 'objection_handling',
    });

    expect(res.status).toBe(200);
    expect(res.body.drillPlan).toBeDefined();
    expect(res.body.drillPlan.mode).toBe('drill');
    expect(res.body.drillPlan.primarySkill).toBe('objection_handling');
    expect(hoisted.convUpdate).toHaveBeenCalled();
    expect(hoisted.getTopWeaknessesForUser).not.toHaveBeenCalled();

    const history = hoisted.llmChat.mock.calls[0]?.[0] as { role: string; content: string }[];
    const system = history?.[0]?.content ?? '';
    expect(system).toContain('FOCUSED DRILL');
    expect(system).toContain('focused practice drill');
  });

  it('continuing drill: loads stored drill plan without weakness fetch', async () => {
    const { stored } = buildDrillScenarioPlan({
      primarySkill: 'closing',
      persona: { name: 'Riley', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 'seed',
    });

    hoisted.convFindUnique.mockResolvedValue({
      id: 'c-drill',
      personaId: 'p1',
      userId: 'u1',
      simulationMode: 'drill',
      adaptiveScenarioPlan: null,
      drillPlan: stored as object,
      messages: [],
    });

    const res = await request(app).post('/chat').send({
      conversationId: 'c-drill',
      personaId: 'p1',
      userId: 'u1',
      message: 'Next',
      mode: 'roleplay',
      simulationMode: 'drill',
      primaryDrillSkill: 'closing',
    });

    expect(res.status).toBe(200);
    expect(hoisted.getTopWeaknessesForUser).not.toHaveBeenCalled();
    expect(hoisted.convUpdate).not.toHaveBeenCalled();
    const history = hoisted.llmChat.mock.calls[0]?.[0] as { role: string; content: string }[];
    expect(history?.[0]?.content ?? '').toContain('FOCUSED DRILL');
  });
});
