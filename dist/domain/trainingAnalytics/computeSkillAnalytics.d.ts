import { type SalesSkill } from '../../schemas/coaching';
import type { SkillAnalytics } from '../../schemas/trainingAnalytics';
import type { GradedSessionScores } from './types';
/** Session skills sorted weakest→strongest; ties broken by lower enum order first (stable). */
export declare function bottomTierSkillsForSession(scores: Record<SalesSkill, number>): SalesSkill[];
export declare function computeSkillAnalytics(sessions: GradedSessionScores[]): SkillAnalytics[];
//# sourceMappingURL=computeSkillAnalytics.d.ts.map