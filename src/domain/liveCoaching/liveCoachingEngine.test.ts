import { describe, it, expect } from 'vitest';
import { computeLiveCoachingSuggestion } from './liveCoachingEngine';
import type { SalesSkill } from '../../schemas/coaching';

const neutralScores = (): Record<SalesSkill, number> => ({
  discovery_questions: 5,
  objection_handling: 5,
  product_knowledge: 5,
  closing: 5,
  storytelling: 5,
  empathy: 5,
});

describe('computeLiveCoachingSuggestion', () => {
  it('returns objection_handling when customer objects (generic mode, high confidence)', () => {
    const s = computeLiveCoachingSuggestion({
      simulationMode: 'generic',
      transcript: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'This is too expensive for my budget.' },
      ],
      targetWeaknesses: [],
      skillScores: neutralScores(),
      focusSkills: [],
      currentUserTurnIndex: 1,
    });
    expect(s).not.toBeNull();
    expect(s!.kind).toBe('objection_handling');
    expect(s!.confidence).toBe('high');
  });

  it('generic mode suppresses medium-only triggers like empathy', () => {
    const s = computeLiveCoachingSuggestion({
      simulationMode: 'generic',
      transcript: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'I feel overwhelmed and skeptical about pushy sales.' },
      ],
      targetWeaknesses: [],
      skillScores: neutralScores(),
      focusSkills: [],
      currentUserTurnIndex: 1,
    });
    expect(s).toBeNull();
  });

  it('adaptive mode allows empathy when it meets medium floor', () => {
    const s = computeLiveCoachingSuggestion({
      simulationMode: 'adaptive',
      transcript: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'I feel overwhelmed and skeptical about pushy sales.' },
      ],
      targetWeaknesses: [],
      skillScores: neutralScores(),
      focusSkills: [],
      currentUserTurnIndex: 1,
    });
    expect(s).not.toBeNull();
    expect(s!.kind).toBe('empathy');
  });

  it('adaptive bumps confidence when kind is in targetWeaknesses', () => {
    const s = computeLiveCoachingSuggestion({
      simulationMode: 'adaptive',
      transcript: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'I feel overwhelmed and skeptical.' },
      ],
      targetWeaknesses: ['empathy'],
      skillScores: neutralScores(),
      focusSkills: [],
      currentUserTurnIndex: 1,
    });
    expect(s!.confidence).toBe('high');
  });

  it('drill biases toward primary skill via confidence bump', () => {
    const s = computeLiveCoachingSuggestion({
      simulationMode: 'drill',
      transcript: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'What is this made of and how do I wash it?' },
      ],
      targetWeaknesses: [],
      drillPrimary: 'product_knowledge',
      skillScores: neutralScores(),
      focusSkills: [],
      currentUserTurnIndex: 1,
    });
    expect(s).not.toBeNull();
    expect(s!.kind).toBe('product_knowledge');
  });
});
