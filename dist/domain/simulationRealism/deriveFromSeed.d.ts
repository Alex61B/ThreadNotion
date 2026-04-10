import type { SimulationRealism } from './types';
/**
 * Deterministic realism profile from a stable seed.
 * This intentionally avoids fully random selection so planners remain reproducible and testable.
 */
export declare function deriveSimulationRealism(seed: string, personaName?: string): SimulationRealism;
//# sourceMappingURL=deriveFromSeed.d.ts.map