import type { Entitlement } from '../../generated/prisma';
export type QuotaDenied = {
    ok: false;
    code: 'PAYWALL_FREE_SIM_LIMIT';
    limit: number;
    current: number;
} | {
    ok: false;
    code: 'QUOTA_TOKENS_DAILY_EXCEEDED';
    limit: number;
    used: number;
} | {
    ok: false;
    code: 'AUTH_REQUIRED';
};
export type QuotaAllowed = {
    ok: true;
};
export type QuotaDecision = QuotaAllowed | QuotaDenied;
export declare function getUtcTodayStart(): Date;
export declare function getEffectiveEntitlementForUser(userId: string): Promise<Entitlement | null>;
export type EffectiveCoverage = {
    kind: 'TEAM';
    teamId: string;
    entitlement: Entitlement;
} | {
    kind: 'USER';
    entitlement: Entitlement | null;
};
export declare function getEffectiveCoverageForUser(userId: string): Promise<EffectiveCoverage>;
export declare function assertCanCreateNewSimulation(args: {
    userId?: string;
}): Promise<QuotaDecision>;
export declare function assertCanConsumeTokens(args: {
    userId?: string;
    estimatedTokens?: number;
}): Promise<QuotaDecision>;
export declare function recordTokenUsage(args: {
    userId: string;
    tokens: number;
}): Promise<void>;
//# sourceMappingURL=quotaGuard.d.ts.map