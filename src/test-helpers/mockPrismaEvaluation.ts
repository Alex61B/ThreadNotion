/**
 * In-memory Prisma subset for simulationEvaluationService integration tests.
 */

type ProfileRow = {
  id: string;
  userId: string;
  skill: string;
  currentScore: number;
  trendDirection: string;
  lastSimulationId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function createEvaluationPrismaMock() {
  const conversations = new Map<string, any>();
  const summaryByConv = new Map<string, any>();
  const scoresByConv = new Map<string, any[]>();
  const profiles = new Map<string, ProfileRow>();

  function profileKey(userId: string, skill: string) {
    return `${userId}::${skill}`;
  }

  const api: any = {
    conversation: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        return conversations.get(where.id) ?? null;
      },
    },

    simulationEvaluationSummary: {
      findUnique: async ({ where }: { where: { conversationId: string } }) => {
        return summaryByConv.get(where.conversationId) ?? null;
      },
      upsert: async (args: {
        where: { conversationId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
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
      deleteMany: async ({ where }: { where: { conversationId: string } }) => {
        scoresByConv.set(where.conversationId, []);
        return { count: 0 };
      },
      createMany: async ({ data }: { data: any[] }) => {
        if (!data.length) return { count: 0 };
        const cid = data[0].conversationId as string;
        const rows = data.map((d, i) => ({
          ...d,
          id: `skill-${cid}-${i}-${d.skill}`,
          createdAt: new Date(),
        }));
        scoresByConv.set(cid, rows);
        return { count: data.length };
      },
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { conversationId: string };
        orderBy?: { skill: string };
      }) => {
        const arr = [...(scoresByConv.get(where.conversationId) ?? [])];
        if (orderBy?.skill === 'asc') {
          arr.sort((a, b) => String(a.skill).localeCompare(String(b.skill)));
        }
        return arr;
      },
    },

    userWeaknessProfile: {
      findUnique: async ({ where }: { where: { userId_skill: { userId: string; skill: string } } }) => {
        const k = profileKey(where.userId_skill.userId, where.userId_skill.skill);
        return profiles.get(k) ?? null;
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { userId_skill: { userId: string; skill: string } };
        create: { userId: string; skill: string; currentScore: number; trendDirection: string; lastSimulationId: string | null };
        update: Record<string, unknown>;
      }) => {
        const k = profileKey(where.userId_skill.userId, where.userId_skill.skill);
        const prev = profiles.get(k);
        const row: ProfileRow = prev
          ? {
              ...prev,
              ...update,
              currentScore: (update.currentScore as number) ?? prev.currentScore,
              trendDirection: (update.trendDirection as string) ?? prev.trendDirection,
              lastSimulationId: (update.lastSimulationId as string | null) ?? prev.lastSimulationId,
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
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { userId: string };
        orderBy?: { skill: string };
      }) => {
        const rows = [...profiles.values()].filter((p) => p.userId === where.userId);
        if (orderBy?.skill === 'asc') {
          rows.sort((a, b) => a.skill.localeCompare(b.skill));
        }
        return rows;
      },
    },

    $transaction: async (fn: (tx: any) => Promise<void>) => {
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
    prisma: api as any,
    reset() {
      conversations.clear();
      summaryByConv.clear();
      scoresByConv.clear();
      profiles.clear();
    },
    seedConversation(row: any) {
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
