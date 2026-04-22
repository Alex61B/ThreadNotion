import { describe, it, expect } from 'vitest';
import { MOMENT_TYPES } from '../../schemas/momentCoaching';
import { SALES_SKILLS } from '../../schemas/coaching';
import {
  MOMENT_PLAYBOOK_CATALOG,
  getPlaybook,
  getPlaybookDescriptionsForClassification,
} from './momentPlaybooks';

describe('MOMENT_PLAYBOOK_CATALOG', () => {
  it('has an entry for every moment type', () => {
    for (const momentType of MOMENT_TYPES) {
      expect(MOMENT_PLAYBOOK_CATALOG[momentType]).toBeDefined();
    }
  });

  it('each playbook has the correct momentType field', () => {
    for (const momentType of MOMENT_TYPES) {
      expect(MOMENT_PLAYBOOK_CATALOG[momentType].momentType).toBe(momentType);
    }
  });

  it('each playbook has 3–6 steps', () => {
    for (const momentType of MOMENT_TYPES) {
      const { steps } = MOMENT_PLAYBOOK_CATALOG[momentType];
      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(steps.length).toBeLessThanOrEqual(6);
    }
  });

  it('each step has a sequential stepNumber starting at 1', () => {
    for (const momentType of MOMENT_TYPES) {
      const { steps } = MOMENT_PLAYBOOK_CATALOG[momentType];
      steps.forEach((step, i) => {
        expect(step.stepNumber).toBe(i + 1);
      });
    }
  });

  it('each playbook maps to at least one valid SalesSkill', () => {
    for (const momentType of MOMENT_TYPES) {
      const { skillMappings } = MOMENT_PLAYBOOK_CATALOG[momentType];
      expect(skillMappings.length).toBeGreaterThan(0);
      for (const skill of skillMappings) {
        expect(SALES_SKILLS).toContain(skill);
      }
    }
  });

  it('each playbook has at least 2 customer signals', () => {
    for (const momentType of MOMENT_TYPES) {
      expect(MOMENT_PLAYBOOK_CATALOG[momentType].customerSignals.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each playbook has at least 2 common mistakes', () => {
    for (const momentType of MOMENT_TYPES) {
      expect(MOMENT_PLAYBOOK_CATALOG[momentType].commonMistakes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each playbook has strong and weak examples with non-empty text and annotation', () => {
    for (const momentType of MOMENT_TYPES) {
      const { strongExample, weakExample } = MOMENT_PLAYBOOK_CATALOG[momentType];
      expect(strongExample.text.length).toBeGreaterThan(0);
      expect(strongExample.annotation.length).toBeGreaterThan(0);
      expect(weakExample.text.length).toBeGreaterThan(0);
      expect(weakExample.annotation.length).toBeGreaterThan(0);
    }
  });
});

describe('getPlaybook', () => {
  it('returns the correct playbook for a valid moment type', () => {
    const pb = getPlaybook('price_hesitation');
    expect(pb.momentType).toBe('price_hesitation');
    expect(pb.label).toBe('Price Hesitation');
  });

  it('throws for an unknown moment type', () => {
    expect(() => getPlaybook('nonexistent' as never)).toThrow();
  });
});

describe('getPlaybookDescriptionsForClassification', () => {
  it('returns one entry per moment type', () => {
    const descriptions = getPlaybookDescriptionsForClassification();
    expect(descriptions).toHaveLength(MOMENT_TYPES.length);
  });

  it('each entry has id, label, and customerSignals', () => {
    const descriptions = getPlaybookDescriptionsForClassification();
    for (const d of descriptions) {
      expect(typeof d.id).toBe('string');
      expect(typeof d.label).toBe('string');
      expect(Array.isArray(d.customerSignals)).toBe(true);
      expect(d.customerSignals.length).toBeGreaterThan(0);
    }
  });
});
