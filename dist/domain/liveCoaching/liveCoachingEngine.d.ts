import type { SimulationMode } from '../../../generated/prisma';
import type { SalesSkill } from '../../schemas/coaching';
import type { LiveCoachingSuggestion } from '../../schemas/liveCoaching';
export type TranscriptTurn = {
    role: 'user' | 'assistant';
    content: string;
};
export type LiveCoachingEngineInput = {
    simulationMode: SimulationMode;
    transcript: TranscriptTurn[];
    targetWeaknesses: SalesSkill[];
    drillPrimary?: SalesSkill;
    drillSecondary?: SalesSkill;
    skillScores: Record<SalesSkill, number>;
    focusSkills: SalesSkill[];
    /** 1-based count of user messages in the conversation (including the turn just completed). */
    currentUserTurnIndex: number;
};
/**
 * Pure: pick at most one coaching suggestion from transcript + mode context.
 * Cooldown / per-conversation caps are enforced in the service using persisted meta.
 */
export declare function computeLiveCoachingSuggestion(input: LiveCoachingEngineInput): LiveCoachingSuggestion | null;
//# sourceMappingURL=liveCoachingEngine.d.ts.map