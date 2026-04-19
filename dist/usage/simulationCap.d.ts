export type SimulationCapDenied = {
    ok: false;
    code: 'PAYWALL_FREE_SIM_LIMIT';
    limit: number;
    current: number;
};
export type SimulationCapAllowed = {
    ok: true;
};
export type SimulationCapDecision = SimulationCapAllowed | SimulationCapDenied;
/**
 * Atomically checks and increments the per-user simulation count.
 * Uses row-level locking on UserSimulationUsage to prevent concurrent bypass.
 */
export declare function assertAndIncrementSimulationCount(args: {
    userId: string;
}): Promise<SimulationCapDecision>;
//# sourceMappingURL=simulationCap.d.ts.map