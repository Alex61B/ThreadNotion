import { describe, expect, it } from 'vitest';
import type { SalesSkill } from '../schemas/coaching';
import { selectTopWeaknesses } from './weaknessSelection';

function scores(partial: Partial<Record<SalesSkill, number>>): Record<SalesSkill, number> {
  return {
    discovery_questions: 5,
    objection_handling: 5,
    product_knowledge: 5,
    closing: 5,
    storytelling: 5,
    empathy: 5,
    ...partial,
  };
}

describe('selectTopWeaknesses', () => {
  it('returns three lowest when none below 5', () => {
    const s = scores({ discovery_questions: 6, objection_handling: 7, product_knowledge: 8 });
    const top = selectTopWeaknesses(s);
    expect(top).toHaveLength(3);
    expect(top).toEqual(
      expect.arrayContaining(['closing', 'storytelling', 'empathy'])
    );
  });

  it('includes skills below 5 first', () => {
    const s = scores({
      discovery_questions: 3,
      objection_handling: 4,
      product_knowledge: 9,
      closing: 9,
      storytelling: 9,
      empathy: 9,
    });
    const top = selectTopWeaknesses(s);
    expect(top.slice(0, 2)).toEqual(
      expect.arrayContaining(['discovery_questions', 'objection_handling'])
    );
  });

  it('when four below 5, returns three lowest scores', () => {
    const s = scores({
      discovery_questions: 2,
      objection_handling: 3,
      product_knowledge: 1,
      closing: 4,
      storytelling: 9,
      empathy: 9,
    });
    const top = selectTopWeaknesses(s);
    expect(top).toHaveLength(3);
    expect(top).toContain('product_knowledge');
    expect(top).toContain('discovery_questions');
  });
});
