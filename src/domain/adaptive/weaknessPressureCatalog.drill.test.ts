import { describe, it, expect } from 'vitest';
import { pickPressureByIndex } from './weaknessPressureCatalog';

describe('pickPressureByIndex', () => {
  it('rotates deterministically', () => {
    const a = pickPressureByIndex('objection_handling', 0);
    const b = pickPressureByIndex('objection_handling', 1);
    expect(a.id).not.toBe(b.id);
    expect(pickPressureByIndex('objection_handling', 0).id).toBe(a.id);
  });
});
