import { describe, it, expect } from 'vitest';
import { SALES_SKILLS, type SalesSkill } from '../../schemas/coaching';
import { computeModeAnalytics } from './computeModeAnalytics';
import type { GradedSessionScores } from './types';

function fullScores(overrides: Partial<Record<SalesSkill, number>>): Record<SalesSkill, number> {
  const out = {} as Record<SalesSkill, number>;
  for (const s of SALES_SKILLS) {
    out[s] = overrides[s] ?? 5;
  }
  return out;
}

function sess(
  id: string,
  mode: GradedSessionScores['mode'],
  meanLevel: number
): GradedSessionScores {
  const base = Math.floor(meanLevel);
  return {
    conversationId: id,
    gradedAt: `2025-01-01T12:00:00.000Z`,
    mode,
    scores: fullScores({
      discovery_questions: base,
      objection_handling: base,
      product_knowledge: base,
      closing: base,
      storytelling: base,
      empathy: base + (meanLevel % 1 > 0 ? 1 : 0),
    }),
  };
}

describe('computeModeAnalytics', () => {
  it('counts sessions per mode', () => {
    const sessions: GradedSessionScores[] = [
      { ...sess('1', 'generic', 5), gradedAt: '2025-01-01T12:00:00.000Z' },
      { ...sess('2', 'generic', 5), gradedAt: '2025-01-02T12:00:00.000Z' },
      { ...sess('3', 'adaptive', 5), gradedAt: '2025-01-03T12:00:00.000Z' },
    ];
    const modes = computeModeAnalytics(sessions);
    expect(modes.find((m) => m.mode === 'generic')?.sessionCount).toBe(2);
    expect(modes.find((m) => m.mode === 'adaptive')?.sessionCount).toBe(1);
    expect(modes.find((m) => m.mode === 'drill')?.sessionCount).toBe(0);
  });

  it('averages next-session mean deltas per mode (skips last session globally)', () => {
    const s0: GradedSessionScores = {
      conversationId: 'a',
      gradedAt: '2025-01-01T12:00:00.000Z',
      mode: 'generic',
      scores: fullScores({}),
    };
    for (const k of Object.keys(s0.scores) as SalesSkill[]) {
      s0.scores[k] = 4;
    }
    const s1: GradedSessionScores = {
      conversationId: 'b',
      gradedAt: '2025-01-02T12:00:00.000Z',
      mode: 'generic',
      scores: fullScores({}),
    };
    for (const k of Object.keys(s1.scores) as SalesSkill[]) {
      s1.scores[k] = 6;
    }
    const modes = computeModeAnalytics([s0, s1]);
    const g = modes.find((m) => m.mode === 'generic')!;
    expect(g.averageScoreImprovement).toBeCloseTo(2, 5);
  });

  it('does not define averageScoreImprovement when no next session exists for that mode only', () => {
    const s = sess('only', 'drill', 5);
    s.gradedAt = '2025-01-01T12:00:00.000Z';
    const modes = computeModeAnalytics([s]);
    const d = modes.find((m) => m.mode === 'drill')!;
    expect(d.sessionCount).toBe(1);
    expect(d.averageScoreImprovement).toBeUndefined();
  });

  it('supports history with only one simulation mode (all generic)', () => {
    const sessions: GradedSessionScores[] = [
      { ...sess('1', 'generic', 4), gradedAt: '2025-01-01T12:00:00.000Z' },
      { ...sess('2', 'generic', 5), gradedAt: '2025-01-02T12:00:00.000Z' },
      { ...sess('3', 'generic', 6), gradedAt: '2025-01-03T12:00:00.000Z' },
    ];
    const modes = computeModeAnalytics(sessions);
    expect(modes.find((m) => m.mode === 'generic')?.sessionCount).toBe(3);
    expect(modes.find((m) => m.mode === 'adaptive')?.sessionCount).toBe(0);
    const g = modes.find((m) => m.mode === 'generic')!;
    expect(g.averageScoreImprovement).toBeDefined();
  });

  it('attributes each delta to current session mode only (chronological pairs, not grouped by mode)', () => {
    const gLow: GradedSessionScores = {
      conversationId: 'g1',
      gradedAt: '2025-01-01T12:00:00.000Z',
      mode: 'generic',
      scores: fullScores({}),
    };
    for (const k of Object.keys(gLow.scores) as SalesSkill[]) {
      gLow.scores[k] = 4;
    }
    const aHigh: GradedSessionScores = {
      conversationId: 'a1',
      gradedAt: '2025-01-02T12:00:00.000Z',
      mode: 'adaptive',
      scores: fullScores({}),
    };
    for (const k of Object.keys(aHigh.scores) as SalesSkill[]) {
      aHigh.scores[k] = 6;
    }
    const dFlat: GradedSessionScores = {
      conversationId: 'd1',
      gradedAt: '2025-01-03T12:00:00.000Z',
      mode: 'drill',
      scores: fullScores({}),
    };
    for (const k of Object.keys(dFlat.scores) as SalesSkill[]) {
      dFlat.scores[k] = 6;
    }
    const modes = computeModeAnalytics([gLow, aHigh, dFlat]);
    const gen = modes.find((m) => m.mode === 'generic')!;
    const ada = modes.find((m) => m.mode === 'adaptive')!;
    const drill = modes.find((m) => m.mode === 'drill')!;
    expect(gen.averageScoreImprovement).toBeCloseTo(2, 5);
    expect(ada.averageScoreImprovement).toBeCloseTo(0, 5);
    expect(drill.averageScoreImprovement).toBeUndefined();
  });

  it('averages multiple same-mode deltas when mode repeats in timeline', () => {
    const sessions: GradedSessionScores[] = [
      { ...sess('1', 'generic', 4), gradedAt: '2025-01-01T12:00:00.000Z' },
      { ...sess('2', 'generic', 5), gradedAt: '2025-01-02T12:00:00.000Z' },
      { ...sess('3', 'generic', 7), gradedAt: '2025-01-03T12:00:00.000Z' },
    ];
    const g = computeModeAnalytics(sessions).find((m) => m.mode === 'generic')!;
    const d1 = 1;
    const d2 = 2;
    expect(g.averageScoreImprovement).toBeCloseTo((d1 + d2) / 2, 5);
  });

  it('single graded session yields counts but no improvement averages', () => {
    const s = { ...sess('solo', 'adaptive', 5), gradedAt: '2025-01-01T12:00:00.000Z' };
    const modes = computeModeAnalytics([s]);
    expect(modes.find((m) => m.mode === 'adaptive')?.sessionCount).toBe(1);
    expect(modes.every((m) => m.averageScoreImprovement === undefined)).toBe(true);
  });
});
