import { describe, it, expect, beforeEach } from 'vitest';
import {
  sessionsSinceLastTouchedSkill,
  lastPracticedSkillFromSessions,
  consecutiveDrillStreakForSkill,
} from './recentGradedSession';
import type { RecentGradedSession } from './recentGradedSession';

let sid = 0;
function sess(
  overrides: Partial<RecentGradedSession> & Pick<RecentGradedSession, 'simulationMode'>
): RecentGradedSession {
  sid += 1;
  return {
    conversationId: `c-${sid}`,
    createdAt: new Date(),
    adaptiveTargetWeaknesses: [],
    ...overrides,
  };
}

beforeEach(() => {
  sid = 0;
});

describe('sessionsSinceLastTouchedSkill', () => {
  it('returns full array length when skill was never touched', () => {
    const sessions = [
      sess({ simulationMode: 'generic', lowestSkillInSession: 'closing' }),
      sess({ simulationMode: 'generic', lowestSkillInSession: 'closing' }),
    ];
    expect(sessionsSinceLastTouchedSkill(sessions, 'discovery_questions')).toBe(2);
  });

  it('returns 0 when skill touched in most recent session via lowestSkillInSession', () => {
    const sessions = [sess({ simulationMode: 'generic', lowestSkillInSession: 'empathy' })];
    expect(sessionsSinceLastTouchedSkill(sessions, 'empathy')).toBe(0);
  });

  it('detects touch via adaptiveTargetWeaknesses', () => {
    const sessions = [
      sess({ simulationMode: 'adaptive', adaptiveTargetWeaknesses: ['closing', 'empathy'] }),
      sess({ simulationMode: 'generic' }),
    ];
    expect(sessionsSinceLastTouchedSkill(sessions, 'closing')).toBe(0);
  });

  it('detects touch via drill secondary', () => {
    const sessions = [
      sess({
        simulationMode: 'drill',
        drillPrimarySkill: 'discovery_questions',
        drillSecondarySkill: 'closing',
      }),
    ];
    expect(sessionsSinceLastTouchedSkill(sessions, 'closing')).toBe(0);
  });

  it('handles mixed drill then generic history', () => {
    const sessions = [
      sess({ simulationMode: 'generic' }),
      sess({ simulationMode: 'drill', drillPrimarySkill: 'storytelling' }),
      sess({ simulationMode: 'generic' }),
    ];
    expect(sessionsSinceLastTouchedSkill(sessions, 'storytelling')).toBe(1);
  });

  it('returns 0 for empty sessions array', () => {
    expect(sessionsSinceLastTouchedSkill([], 'closing')).toBe(0);
  });
});

describe('lastPracticedSkillFromSessions', () => {
  it('returns undefined for empty sessions', () => {
    expect(lastPracticedSkillFromSessions([])).toBeUndefined();
  });

  it('prefers drill primary on latest session', () => {
    const sessions = [sess({ simulationMode: 'drill', drillPrimarySkill: 'closing' })];
    expect(lastPracticedSkillFromSessions(sessions)).toBe('closing');
  });

  it('uses first adaptive weakness when not drill with primary', () => {
    const sessions = [
      sess({ simulationMode: 'adaptive', adaptiveTargetWeaknesses: ['empathy', 'closing'] }),
    ];
    expect(lastPracticedSkillFromSessions(sessions)).toBe('empathy');
  });

  it('falls back to lowestSkillInSession for generic', () => {
    const sessions = [
      sess({ simulationMode: 'generic', lowestSkillInSession: 'product_knowledge' }),
    ];
    expect(lastPracticedSkillFromSessions(sessions)).toBe('product_knowledge');
  });

  it('returns undefined for generic with no lowest skill metadata', () => {
    const sessions = [sess({ simulationMode: 'generic' })];
    expect(lastPracticedSkillFromSessions(sessions)).toBeUndefined();
  });

  it('drill without primary still uses adaptive weaknesses when present', () => {
    const sessions = [
      sess({
        simulationMode: 'drill',
        adaptiveTargetWeaknesses: ['closing'],
        lowestSkillInSession: 'empathy',
      }),
    ];
    expect(lastPracticedSkillFromSessions(sessions)).toBe('closing');
  });
});

describe('consecutiveDrillStreakForSkill', () => {
  it('returns 0 when latest session is not drill', () => {
    const sessions = [
      sess({ simulationMode: 'generic' }),
      sess({ simulationMode: 'drill', drillPrimarySkill: 'closing' }),
    ];
    expect(consecutiveDrillStreakForSkill(sessions, 'closing')).toBe(0);
  });
});
