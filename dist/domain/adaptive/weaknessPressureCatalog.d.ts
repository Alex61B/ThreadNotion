import type { SalesSkill } from '../../schemas/coaching';
export type PressureOption = {
    id: string;
    label: string;
    /** Shown to the LLM as customer behavior; must not include skill enum strings. */
    customerLine: string;
};
/**
 * Multiple pressure options per skill. Pick 1–2 per skill in the plan builder;
 * coherence may merge or drop redundant entries.
 */
export declare const WEAKNESS_PRESSURE_CATALOG: Record<SalesSkill, PressureOption[]>;
export declare function catalogPressureOptionsForSkill(skill: SalesSkill): PressureOption[];
/** Stable pick: first option per skill (deterministic). Plan service can merge picks from coherence. */
export declare function pickPrimaryPressure(skill: SalesSkill): PressureOption;
export declare function pickSecondaryPressure(skill: SalesSkill): PressureOption | null;
/**
 * Deterministic index selection for a pressure option, used to add variability without randomness.
 * Keep salts stable so plans are reproducible per conversation.
 */
export declare function pickPressureIndexFromSeed(seed: string, skill: SalesSkill, salt: string): number;
/** Deterministic rotation for drills (0-based index modulo length). */
export declare function pickPressureByIndex(skill: SalesSkill, index: number): PressureOption;
export declare function assertCatalogHasAllSkills(): void;
//# sourceMappingURL=weaknessPressureCatalog.d.ts.map