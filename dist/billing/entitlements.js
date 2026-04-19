"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FREE_SIMULATION_LIMIT = void 0;
exports.getFreeDailyTokenLimit = getFreeDailyTokenLimit;
exports.getIndividualDailyTokenLimit = getIndividualDailyTokenLimit;
exports.upsertUserEntitlement = upsertUserEntitlement;
const db_1 = require("../db");
function envInt(name, fallback) {
    const raw = process.env[name];
    if (!raw)
        return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0)
        return fallback;
    return Math.floor(n);
}
exports.FREE_SIMULATION_LIMIT = 5;
function getFreeDailyTokenLimit() {
    // MVP default keeps Free usable while still enforcing a cap.
    return envInt('FREE_DAILY_TOKEN_LIMIT', 20000);
}
function getIndividualDailyTokenLimit() {
    return envInt('INDIVIDUAL_DAILY_TOKEN_LIMIT', 200000);
}
async function upsertUserEntitlement(args) {
    const dailyTokenLimit = args.planType === 'INDIVIDUAL' ? getIndividualDailyTokenLimit() : getFreeDailyTokenLimit();
    await db_1.prisma.entitlement.upsert({
        where: {
            subjectType_subjectId: { subjectType: 'USER', subjectId: args.userId },
        },
        create: {
            subjectType: 'USER',
            subjectId: args.userId,
            planType: args.planType,
            maxSeats: 1,
            dailyTokenLimit,
            freeSimulationLimit: exports.FREE_SIMULATION_LIMIT,
        },
        update: {
            planType: args.planType,
            maxSeats: 1,
            dailyTokenLimit,
            freeSimulationLimit: exports.FREE_SIMULATION_LIMIT,
        },
    });
}
//# sourceMappingURL=entitlements.js.map