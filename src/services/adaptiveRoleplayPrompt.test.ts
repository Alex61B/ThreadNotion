import { describe, it, expect } from 'vitest';
import { buildRoleplaySystemPrompt } from './adaptiveRoleplayPrompt';
import { buildAdaptiveScenarioPlan } from './adaptiveScenarioPlanService';
import { buildDrillScenarioPlan } from './drillScenarioPlanService';

describe('buildRoleplaySystemPrompt', () => {
  const base = `You are roleplaying as a customer.\n\nYOUR PERSONA: Alex\n\nRULES:\n1. Stay in character.`;

  it('returns base only when plan is null', () => {
    expect(buildRoleplaySystemPrompt({ baseFashionBlock: base, plan: null })).toBe(base);
  });

  it('returns base only when no weaknesses in plan', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: [],
      persona: { name: 'Alex', tone: null, instructions: 'x' },
      product: null,
    });
    expect(buildRoleplaySystemPrompt({ baseFashionBlock: base, plan })).toBe(base);
  });

  it('adds realism section when plan has weaknesses', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing'],
      persona: { name: 'Alex', tone: null, instructions: 'x' },
      product: null,
      realismSeed: 'seed',
    });
    const out = buildRoleplaySystemPrompt({ baseFashionBlock: base, plan });
    expect(out).toContain('SCENARIO REALISM');
    expect(out).toContain('REALISM / BUYER PROFILE');
    expect(out).toContain('CONSTRAINTS');
    expect(out).toContain('GOAL FOR THIS RUN');
    expect(out.toLowerCase()).not.toContain('closing');
    expect(out).not.toContain('SalesSkill');
  });

  it('uses drill section title and closing line when practiceKind is drill', () => {
    const { promptPlan } = buildDrillScenarioPlan({
      primarySkill: 'objection_handling',
      persona: { name: 'Alex', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 't',
      realismSeed: 'seed',
    });
    const out = buildRoleplaySystemPrompt({
      baseFashionBlock: base,
      plan: promptPlan,
      practiceKind: 'drill',
    });
    expect(out).toContain('FOCUSED DRILL');
    expect(out).not.toContain('SCENARIO REALISM');
    expect(out).toContain('compact drill');
  });

  it('deduplicates identical customer tactic lines', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing', 'objection_handling'],
      persona: { name: 'Alex', tone: null, instructions: 'x' },
      product: null,
    });
    const dup = {
      ...plan,
      pressureTactics: [
        ...plan.pressureTactics,
        { id: 'dup', label: 'd', customerLine: plan.pressureTactics[0]!.customerLine },
      ],
    };
    const out = buildRoleplaySystemPrompt({ baseFashionBlock: base, plan: dup });
    const first = plan.pressureTactics[0]!.customerLine;
    expect(out.split(first).length - 1).toBe(1);
  });
});
