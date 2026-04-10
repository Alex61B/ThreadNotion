"use strict";
/**
 * In-memory Prisma subset for simulationEvaluationService integration tests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvaluationPrismaMock = createEvaluationPrismaMock;
function createEvaluationPrismaMock() {
    const conversations = new Map();
    const summaryByConv = new Map();
    const scoresByConv = new Map();
    const profiles = new Map();
    function profileKey(userId, skill) {
        return `${userId}::${skill}`;
    }
    const api = {
        conversation: {
            findUnique: async ({ where }) => {
                return conversations.get(where.id) ?? null;
            },
        },
        simulationEvaluationSummary: {
            findUnique: async ({ where }) => {
                return summaryByConv.get(where.conversationId) ?? null;
            },
            upsert: async (args) => {
                const existing = summaryByConv.get(args.where.conversationId);
                const row = {
                    ...(existing ?? {}),
                    ...args.create,
                    ...args.update,
                    id: existing?.id ?? 'summary-id',
                    conversationId: args.where.conversationId,
                };
                summaryByConv.set(args.where.conversationId, row);
                return row;
            },
        },
        simulationSkillScore: {
            deleteMany: async ({ where }) => {
                scoresByConv.set(where.conversationId, []);
                return { count: 0 };
            },
            createMany: async ({ data }) => {
                if (!data.length)
                    return { count: 0 };
                const cid = data[0].conversationId;
                const rows = data.map((d, i) => ({
                    ...d,
                    id: `skill-${cid}-${i}-${d.skill}`,
                    createdAt: new Date(),
                }));
                scoresByConv.set(cid, rows);
                return { count: data.length };
            },
            findMany: async ({ where, orderBy, }) => {
                const arr = [...(scoresByConv.get(where.conversationId) ?? [])];
                if (orderBy?.skill === 'asc') {
                    arr.sort((a, b) => String(a.skill).localeCompare(String(b.skill)));
                }
                return arr;
            },
        },
        userWeaknessProfile: {
            findUnique: async ({ where }) => {
                const k = profileKey(where.userId_skill.userId, where.userId_skill.skill);
                return profiles.get(k) ?? null;
            },
            upsert: async ({ where, create, update, }) => {
                const k = profileKey(where.userId_skill.userId, where.userId_skill.skill);
                const prev = profiles.get(k);
                const row = prev
                    ? {
                        ...prev,
                        ...update,
                        currentScore: update.currentScore ?? prev.currentScore,
                        trendDirection: update.trendDirection ?? prev.trendDirection,
                        lastSimulationId: update.lastSimulationId ?? prev.lastSimulationId,
                        updatedAt: new Date(),
                    }
                    : {
                        id: `prof-${k}`,
                        userId: create.userId,
                        skill: create.skill,
                        currentScore: create.currentScore,
                        trendDirection: create.trendDirection,
                        lastSimulationId: create.lastSimulationId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                profiles.set(k, row);
                return row;
            },
            findMany: async ({ where, orderBy, }) => {
                const rows = [...profiles.values()].filter((p) => p.userId === where.userId);
                if (orderBy?.skill === 'asc') {
                    rows.sort((a, b) => a.skill.localeCompare(b.skill));
                }
                return rows;
            },
        },
        $transaction: async (fn) => {
            const tx = {
                simulationSkillScore: api.simulationSkillScore,
                simulationEvaluationSummary: {
                    upsert: api.simulationEvaluationSummary.upsert,
                },
            };
            await fn(tx);
        },
    };
    return {
        prisma: api,
        reset() {
            conversations.clear();
            summaryByConv.clear();
            scoresByConv.clear();
            profiles.clear();
        },
        seedConversation(row) {
            conversations.set(row.id, row);
        },
        getSummary() {
            return summaryByConv;
        },
        getScores() {
            return scoresByConv;
        },
        getProfiles() {
            return profiles;
        },
    };
}
//# sourceMappingURL=mockPrismaEvaluation.js.map