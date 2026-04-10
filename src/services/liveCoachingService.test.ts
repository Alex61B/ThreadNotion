import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLiveCoachingAfterChatTurn } from './liveCoachingService';

const hoisted = vi.hoisted(() => ({
  getMerged: vi.fn(),
  getFocus: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock('./weaknessProfileService', () => ({
  getMergedSkillScoresForUser: hoisted.getMerged,
}));

vi.mock('./userTrainingFocusService', () => ({
  getTrainingFocusForUser: hoisted.getFocus,
}));

vi.mock('../db', () => ({
  prisma: {
    conversation: {
      findUnique: hoisted.findUnique,
      update: hoisted.update,
    },
  },
}));

describe('getLiveCoachingAfterChatTurn', () => {
  beforeEach(() => {
    hoisted.getMerged.mockReset();
    hoisted.getFocus.mockReset();
    hoisted.findUnique.mockReset();
    hoisted.update.mockReset();
    hoisted.getMerged.mockResolvedValue({
      discovery_questions: 5,
      objection_handling: 5,
      product_knowledge: 5,
      closing: 5,
      storytelling: 5,
      empathy: 5,
    });
    hoisted.getFocus.mockResolvedValue(null);
  });

  it('returns null when disabled or assistant mode', async () => {
    expect(
      await getLiveCoachingAfterChatTurn({
        conversationId: 'c1',
        userId: 'u1',
        liveCoachingEnabled: false,
        chatMode: 'roleplay',
      })
    ).toBeNull();
    expect(
      await getLiveCoachingAfterChatTurn({
        conversationId: 'c1',
        userId: 'u1',
        liveCoachingEnabled: true,
        chatMode: 'assistant',
      })
    ).toBeNull();
    expect(hoisted.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when max suggestions reached', async () => {
    hoisted.findUnique.mockResolvedValue({
      id: 'c1',
      simulationMode: 'adaptive',
      adaptiveScenarioPlan: null,
      drillPlan: null,
      liveCoachingMeta: { suggestionsShown: 5 },
      messages: [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
      ],
    });
    const r = await getLiveCoachingAfterChatTurn({
      conversationId: 'c1',
      userId: 'u1',
      liveCoachingEnabled: true,
      chatMode: 'roleplay',
    });
    expect(r).toBeNull();
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it('returns null when cooldown between suggestions not met', async () => {
    hoisted.findUnique.mockResolvedValue({
      id: 'c1',
      simulationMode: 'adaptive',
      adaptiveScenarioPlan: null,
      drillPlan: null,
      liveCoachingMeta: {
        lastSuggestionUserTurnIndex: 2,
        suggestionsShown: 1,
        recentKinds: ['objection_handling'],
      },
      messages: [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
        { role: 'user', content: 'c' },
        { role: 'assistant', content: 'd' },
      ],
    });
    const r = await getLiveCoachingAfterChatTurn({
      conversationId: 'c1',
      userId: 'u1',
      liveCoachingEnabled: true,
      chatMode: 'roleplay',
    });
    expect(r).toBeNull();
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it('updates meta and returns suggestion when trigger fires', async () => {
    hoisted.findUnique.mockResolvedValue({
      id: 'c1',
      simulationMode: 'adaptive',
      adaptiveScenarioPlan: null,
      drillPlan: null,
      liveCoachingMeta: null,
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'That is too expensive for me honestly.' },
      ],
    });
    const r = await getLiveCoachingAfterChatTurn({
      conversationId: 'c1',
      userId: 'u1',
      liveCoachingEnabled: true,
      chatMode: 'roleplay',
    });
    expect(r).not.toBeNull();
    expect(r!.kind).toBe('objection_handling');
    expect(hoisted.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({
        liveCoachingMeta: expect.objectContaining({
          lastSuggestionUserTurnIndex: 1,
          suggestionsShown: 1,
          recentKinds: ['objection_handling'],
        }),
      }),
    });
  });

  it('dedupes repeated kind in recentKinds without updating', async () => {
    hoisted.findUnique.mockResolvedValue({
      id: 'c1',
      simulationMode: 'adaptive',
      adaptiveScenarioPlan: null,
      drillPlan: null,
      liveCoachingMeta: {
        lastSuggestionUserTurnIndex: 0,
        suggestionsShown: 1,
        recentKinds: ['objection_handling'],
      },
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'x' },
        { role: 'user', content: 'Try again' },
        { role: 'assistant', content: 'Still too expensive for my budget.' },
      ],
    });
    const r = await getLiveCoachingAfterChatTurn({
      conversationId: 'c1',
      userId: 'u1',
      liveCoachingEnabled: true,
      chatMode: 'roleplay',
    });
    expect(r).toBeNull();
    expect(hoisted.update).not.toHaveBeenCalled();
  });
});
