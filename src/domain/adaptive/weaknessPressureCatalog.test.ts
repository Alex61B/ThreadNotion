import { describe, it, expect } from 'vitest';
import { SALES_SKILLS } from '../../schemas/coaching';
import {
  WEAKNESS_PRESSURE_CATALOG,
  pickPrimaryPressure,
  assertCatalogHasAllSkills,
} from './weaknessPressureCatalog';

describe('weaknessPressureCatalog', () => {
  it('has at least two pressure entries per skill', () => {
    assertCatalogHasAllSkills();
    for (const s of SALES_SKILLS) {
      expect(WEAKNESS_PRESSURE_CATALOG[s].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('primary pick is stable per skill', () => {
    for (const s of SALES_SKILLS) {
      const p = pickPrimaryPressure(s);
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.customerLine.toLowerCase()).not.toContain(s);
    }
  });
});
