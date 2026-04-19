"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAndIncrementSimulationCount = assertAndIncrementSimulationCount;
const db_1 = require("../db");
const entitlements_1 = require("../billing/entitlements");
/**
 * Atomically checks and increments the per-user simulation count.
 * Uses row-level locking on UserSimulationUsage to prevent concurrent bypass.
 */
async function assertAndIncrementSimulationCount(args) {
    const userId = args.userId;
    return db_1.prisma.$transaction(async (tx) => {
        await tx.userSimulationUsage.upsert({
            where: { userId },
            create: { userId, uniqueSimulationsCount: 0 },
            update: {},
        });
        const locked = (await tx.$queryRaw `SELECT "userId", "uniqueSimulationsCount" FROM "UserSimulationUsage" WHERE "userId" = ${userId} FOR UPDATE`)[0];
        const current = locked?.uniqueSimulationsCount ?? 0;
        if (current >= entitlements_1.FREE_SIMULATION_LIMIT) {
            return { ok: false, code: 'PAYWALL_FREE_SIM_LIMIT', limit: entitlements_1.FREE_SIMULATION_LIMIT, current };
        }
        await tx.userSimulationUsage.update({
            where: { userId },
            data: { uniqueSimulationsCount: { increment: 1 } },
        });
        return { ok: true };
    });
}
//# sourceMappingURL=simulationCap.js.map