import type { SalesSkill } from '../../schemas/coaching';
export type GradedSessionScores = {
    conversationId: string;
    gradedAt: string;
    mode: 'generic' | 'adaptive' | 'drill';
    scores: Record<SalesSkill, number>;
};
//# sourceMappingURL=types.d.ts.map