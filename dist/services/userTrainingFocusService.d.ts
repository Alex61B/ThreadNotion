import type { SalesSkill } from '../schemas/coaching';
export type TrainingFocusRow = {
    userId: string;
    focusSkills: SalesSkill[];
    sessionsRemaining: number | null;
    source: string;
    updatedAt: Date;
};
export declare function getTrainingFocusForUser(userId: string): Promise<TrainingFocusRow | null>;
export declare function upsertTrainingFocus(args: {
    userId: string;
    focusSkills: SalesSkill[];
    sessionsRemaining?: number | null;
    source?: string;
}): Promise<TrainingFocusRow>;
export declare function clearTrainingFocus(userId: string): Promise<void>;
/** After a successful graded session, count down pinned sessions if the user set a limit. */
export declare function decrementTrainingFocusSessionIfAny(userId: string): Promise<void>;
//# sourceMappingURL=userTrainingFocusService.d.ts.map