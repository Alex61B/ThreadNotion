import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { buildAdaptiveScenarioPlan } from './services/adaptiveScenarioPlanService';

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
  hoisted.personaFindUnique.mockResolvedValue(basePersona);
  hoisted.productFindUnique.mockResolvedValue(null);
  hoisted.messageCreateMany.mockResolvedValue({ count: 2 });
}

describe('POST /chat adaptive hardening', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('new adaptive + no weakness profile: does not persist plan and does not call LLM with adaptive block', async () => {
    hoisted.getTopWeaknessesForUser.mockResolvedValue([]);
    hoisted.convCreate.mockResolvedValue({
      id: 'new1',
      personaId: 'p1',
      userId: 'u1',
      simulationMode: 'adaptive',
      adaptiveScenarioPlan: null,
      drillPlan: null,
      messages: [],
    });

    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'Hello',
      mode: 'roleplay',
      simulationMode: 'adaptive',
    });

    expect(res.status).toBe(200);
    expect(hoisted.getTopWeaknessesForUser).toHaveBeenCalledWith('u1', 3);
    expect(hoisted.convUpdate).not.toHaveBeenCalled();
    expect(res.body.adaptiveScenario).toBeUndefined();

    const history = hoisted.llmChat.mock.calls[0]?.[0] as { role: string; content: string }[];
    const system = history?.[0]?.content ?? '';
    expect(system).not.toContain('SCENARIO REALISM');
  });

  it('continuing adaptive with valid stored plan: uses adaptive prompt without refetching weaknesses', async () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing'],
      persona: { name: 'Riley', tone: null, instructions: 'x' },
      product: null,
    });
    hoisted.convFindUnique.mockResolvedValue({
      id: 'c-adapt',
      personaId: 'p1',
      userId: 'u1',
      simulationMode: 'adaptive',
      adaptiveScenarioPlan: plan as object,
      drillPlan: null,
      messages: [],
    });

    const res = await request(app).post('/chat').send({
      conversationId: 'c-adapt',
      personaId: 'p1',
      userId: 'u1',
      message: 'Next line',
      mode: 'roleplay',
      simulationMode: 'adaptive',
    });

    expect(res.status).toBe(200);
    expect(hoisted.getTopWeaknessesForUser).not.toHaveBeenCalled();

    const history = hoisted.llmChat.mock.calls[0]?.[0] as { role: string; content: string }[];
    const system = history?.[0]?.content ?? '';
    expect(system).toContain('SCENARIO REALISM');
  });

  it('continuing adaptive with malformed stored plan: falls back to base prompt, no throw', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    hoisted.convFindUnique.mockResolvedValue({
      id: 'c-bad',
      personaId: 'p1',
      userId: 'u1',
      simulationMode: 'adaptive',
      adaptiveScenarioPlan: { notAPlan: true },
      drillPlan: null,
      messages: [],
    });

    const res = await request(app).post('/chat').send({
      conversationId: 'c-bad',
      personaId: 'p1',
      userId: 'u1',
      message: 'Hi',
      mode: 'roleplay',
      simulationMode: 'adaptive',
    });

    expect(res.status).toBe(200);
    const history = hoisted.llmChat.mock.calls[0]?.[0] as { role: string; content: string }[];
    const system = history?.[0]?.content ?? '';
    expect(system).not.toContain('SCENARIO REALISM');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('generic new conversation: never loads adaptive weaknesses', async () => {
    hoisted.convCreate.mockResolvedValue({
      id: 'g1',
      personaId: 'p1',
      userId: 'u1',
      simulationMode: 'generic',
      adaptiveScenarioPlan: null,
      drillPlan: null,
      messages: [],
    });

    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'Hi',
      mode: 'roleplay',
      simulationMode: 'generic',
    });

    expect(res.status).toBe(200);
    expect(hoisted.getTopWeaknessesForUser).not.toHaveBeenCalled();
    const history = hoisted.llmChat.mock.calls[0]?.[0] as { role: string; content: string }[];
    const system = history?.[0]?.content ?? '';
    expect(system).not.toContain('SCENARIO REALISM');
    expect(system).toContain('REALISM / BUYER PROFILE');
  });

  it('continuing generic: does not inject generic buyer profile block mid-thread', async () => {
    hoisted.convFindUnique.mockResolvedValue({
      id: 'g-continue',
      personaId: 'p1',
      userId: 'u1',
      simulationMode: 'generic',
      adaptiveScenarioPlan: null,
      drillPlan: null,
      messages: [],
    });

    const res = await request(app).post('/chat').send({
      conversationId: 'g-continue',
      personaId: 'p1',
      userId: 'u1',
      message: 'Hi again',
      mode: 'roleplay',
      simulationMode: 'generic',
    });

    expect(res.status).toBe(200);
    const history = hoisted.llmChat.mock.calls[0]?.[0] as { role: string; content: string }[];
    const system = history?.[0]?.content ?? '';
    expect(system).not.toContain('REALISM / BUYER PROFILE');
  });
});
