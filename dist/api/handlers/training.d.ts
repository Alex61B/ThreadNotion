import type { JsonHandlerResult } from '../httpTypes';
export declare function getWeaknessProfile(userId: string): Promise<JsonHandlerResult>;
export declare function getUserProgress(userId: string): Promise<JsonHandlerResult>;
export declare function getUserTrainingAnalytics(userId: string): Promise<JsonHandlerResult>;
export declare function getTrainingRecommendation(userId: string): Promise<JsonHandlerResult>;
export declare function getTrainingAssignments(userId: string): Promise<JsonHandlerResult>;
export declare function getTrainingFocus(userId: string): Promise<JsonHandlerResult>;
export declare function patchTrainingFocus(userId: string, rawBody: unknown): Promise<JsonHandlerResult>;
export declare function deleteTrainingFocus(userId: string): Promise<JsonHandlerResult>;
export declare function getTeamAnalytics(teamId: string, userId: string): Promise<JsonHandlerResult>;
export declare function getTeamMemberProgress(teamId: string, managerUserId: string, memberUserId: string): Promise<JsonHandlerResult>;
export declare function postTeamAssignment(teamId: string, rawBody: unknown): Promise<JsonHandlerResult>;
//# sourceMappingURL=training.d.ts.map