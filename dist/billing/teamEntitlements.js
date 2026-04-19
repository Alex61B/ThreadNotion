"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxSeatsFromBundle = maxSeatsFromBundle;
exports.getTeamDailyTokenLimit = getTeamDailyTokenLimit;
exports.upsertTeamEntitlement = upsertTeamEntitlement;
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
function maxSeatsFromBundle(bundle) {
    switch (bundle) {
        case 'SEATS_10':
            return 10;
        case 'SEATS_25':
            return 25;
        case 'SEATS_50':
            return 50;
        default:
            return 0;
    }
}
function getTeamDailyTokenLimit(bundle) {
    switch (bundle) {
        case 'SEATS_10':
            return envInt('TEAM_DAILY_TOKEN_LIMIT_10', 500000);
        case 'SEATS_25':
            return envInt('TEAM_DAILY_TOKEN_LIMIT_25', 1250000);
        case 'SEATS_50':
            return envInt('TEAM_DAILY_TOKEN_LIMIT_50', 2500000);
        default:
            return 0;
    }
}
async function upsertTeamEntitlement(args) {
    if (args.planType !== 'TEAM') {
        // If team is not paid, remove entitlement by setting FREE-like values.
        await db_1.prisma.entitlement.upsert({
            where: { subjectType_subjectId: { subjectType: 'TEAM', subjectId: args.teamId } },
            create: {
                subjectType: 'TEAM',
                subjectId: args.teamId,
                planType: 'FREE',
                maxSeats: 0,
                dailyTokenLimit: 0,
                freeSimulationLimit: 5,
            },
            update: { planType: 'FREE', maxSeats: 0, dailyTokenLimit: 0, freeSimulationLimit: 5 },
        });
        return;
    }
    const maxSeats = maxSeatsFromBundle(args.seatBundle);
    const dailyTokenLimit = getTeamDailyTokenLimit(args.seatBundle);
    await db_1.prisma.entitlement.upsert({
        where: { subjectType_subjectId: { subjectType: 'TEAM', subjectId: args.teamId } },
        create: {
            subjectType: 'TEAM',
            subjectId: args.teamId,
            planType: 'TEAM',
            maxSeats,
            dailyTokenLimit,
            freeSimulationLimit: 5,
        },
        update: {
            planType: 'TEAM',
            maxSeats,
            dailyTokenLimit,
            freeSimulationLimit: 5,
        },
    });
}
//# sourceMappingURL=teamEntitlements.js.map