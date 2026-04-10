import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const hoisted = vi.hoisted(() => ({
  llmChat: vi.fn().mockResolvedValue('Customer reply'),
  getTopWeaknessesForUser: vi.fn(),
  personaFindUnique: vi.fn(),
  productFindUnique: vi.fn(),
  convFindUnique: vi.fn(),
  convCreate: vi.fn(),
  convUpdate: vi.fn(),
  messageCreateMany: vi.fn(),
  getLiveCoachingAfterChatTurn: vi.fn(),
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

vi.mock('./services/liveCoachingService', () => ({
  getLiveCoachingAfterChatTurn: hoisted.getLiveCoachingAfterChatTurn,
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
  hoisted.getLiveCoachingAfterChatTurn.mockReset();
  hoisted.personaFindUnique.mockResolvedValue(basePersona);
  hoisted.productFindUnique.mockResolvedValue(null);
  hoisted.messageCreateMany.mockResolvedValue({ count: 2 });
  hoisted.convCreate.mockResolvedValue({
    id: 'c-new',
    personaId: 'p1',
    userId: 'u1',
    simulationMode: 'generic',
    adaptiveScenarioPlan: null,
    drillPlan: null,
    messages: [],
  });
}

describe('POST /chat live coaching', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('omits liveCoaching when liveCoachingEnabled is false', async () => {
    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'Hello',
      mode: 'roleplay',
      simulationMode: 'generic',
      liveCoachingEnabled: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.liveCoaching).toBeUndefined();
    expect(hoisted.getLiveCoachingAfterChatTurn).not.toHaveBeenCalled();
  });

  it('includes liveCoaching when enabled and service returns a tip', async () => {
    hoisted.getLiveCoachingAfterChatTurn.mockResolvedValue({
      kind: 'closing',
      message: 'Tip text',
      confidence: 'high',
      triggerSource: 'test',
    });
    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'Hello',
      mode: 'roleplay',
      simulationMode: 'generic',
      liveCoachingEnabled: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.liveCoaching).toEqual({
      kind: 'closing',
      message: 'Tip text',
      confidence: 'high',
      triggerSource: 'test',
    });
    expect(hoisted.getLiveCoachingAfterChatTurn).toHaveBeenCalledWith({
      conversationId: 'c-new',
      userId: 'u1',
      liveCoachingEnabled: true,
      chatMode: 'roleplay',
    });
  });

  it('sends liveCoaching null when service returns null', async () => {
    hoisted.getLiveCoachingAfterChatTurn.mockResolvedValue(null);
    const res = await request(app).post('/chat').send({
      personaId: 'p1',
      userId: 'u1',
      message: 'Hello',
      mode: 'roleplay',
      simulationMode: 'generic',
      liveCoachingEnabled: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.liveCoaching).toBeNull();
  });
});
