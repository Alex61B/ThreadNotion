import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { buildAdaptiveScenarioPlan } from './services/adaptiveScenarioPlanService';
import { buildDrillScenarioPlan } from './services/drillScenarioPlanService';

const hoisted = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    conversation: {
      findMany: hoisted.findMany,
    },
  },
}));

import { app } from './server';

describe('GET /conversations', () => {
  beforeEach(() => {
    hoisted.findMany.mockReset();
  });

  it('includes adaptiveScenarioPlan null when not stored', async () => {
    hoisted.findMany.mockResolvedValue([
      {
        id: 'c1',
        personaId: 'p1',
        userId: 'u1',
        simulationMode: 'generic',
        adaptiveScenarioPlan: null,
        drillPlan: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        persona: { id: 'p1', name: 'Alex', tone: null },
        messages: [],
        evaluation: null,
        evaluationSummary: null,
        skillScores: [],
      },
    ]);

    const res = await request(app).get('/conversations?userId=u1');
    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);
    expect(res.body.conversations[0].adaptiveScenarioPlan).toBeNull();
  });

  it('includes validated adaptiveScenarioPlan when stored', async () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing'],
      persona: { name: 'Jordan', tone: null, instructions: 'x' },
      product: null,
    });
    hoisted.findMany.mockResolvedValue([
      {
        id: 'c2',
        personaId: 'p1',
        userId: 'u1',
        simulationMode: 'adaptive',
        adaptiveScenarioPlan: plan as object,
        drillPlan: null,
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
        persona: { id: 'p1', name: 'Alex', tone: null },
        messages: [],
        evaluation: null,
        evaluationSummary: null,
        skillScores: [],
      },
    ]);

    const res = await request(app).get('/conversations?userId=u1');
    expect(res.status).toBe(200);
    expect(res.body.conversations[0].adaptiveScenarioPlan).toMatchObject({
      coachingFocusSummary: expect.any(String),
      targetWeaknesses: expect.any(Array),
    });
  });

  it('ignores adaptiveScenarioPlan JSON when simulationMode is generic (no parse, no crash)', async () => {
    hoisted.findMany.mockResolvedValue([
      {
        id: 'c3',
        personaId: 'p1',
        userId: 'u1',
        simulationMode: 'generic',
        adaptiveScenarioPlan: { garbage: true },
        drillPlan: null,
        createdAt: new Date('2025-01-03T00:00:00.000Z'),
        persona: { id: 'p1', name: 'Alex', tone: null },
        messages: [],
        evaluation: null,
        evaluationSummary: null,
        skillScores: [],
      },
    ]);

    const res = await request(app).get('/conversations?userId=u1');
    expect(res.status).toBe(200);
    expect(res.body.conversations[0].adaptiveScenarioPlan).toBeNull();
  });

  it('returns null adaptiveScenarioPlan when stored JSON is invalid for adaptive rows', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    hoisted.findMany.mockResolvedValue([
      {
        id: 'c4',
        personaId: 'p1',
        userId: 'u1',
        simulationMode: 'adaptive',
        adaptiveScenarioPlan: { invalid: true },
        drillPlan: null,
        createdAt: new Date('2025-01-04T00:00:00.000Z'),
        persona: { id: 'p1', name: 'Alex', tone: null },
        messages: [],
        evaluation: null,
        evaluationSummary: null,
        skillScores: [],
      },
    ]);

    const res = await request(app).get('/conversations?userId=u1');
    expect(res.status).toBe(200);
    expect(res.body.conversations[0].adaptiveScenarioPlan).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('includes parsed drillPlan when simulationMode is drill', async () => {
    const { stored } = buildDrillScenarioPlan({
      primarySkill: 'closing',
      persona: { name: 'Jordan', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 'conv-test',
    });
    hoisted.findMany.mockResolvedValue([
      {
        id: 'c-drill',
        personaId: 'p1',
        userId: 'u1',
        simulationMode: 'drill',
        adaptiveScenarioPlan: null,
        drillPlan: stored as object,
        createdAt: new Date('2025-01-05T00:00:00.000Z'),
        persona: { id: 'p1', name: 'Alex', tone: null },
        messages: [],
        evaluation: null,
        evaluationSummary: null,
        skillScores: [],
      },
    ]);

    const res = await request(app).get('/conversations?userId=u1');
    expect(res.status).toBe(200);
    expect(res.body.conversations[0].drillPlan).toMatchObject({
      mode: 'drill',
      primarySkill: 'closing',
    });
  });
});
