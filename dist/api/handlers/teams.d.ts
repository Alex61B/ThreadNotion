import type { JsonHandlerResult } from '../httpTypes';
export declare function postTeams(rawBody: unknown): Promise<JsonHandlerResult>;
export declare function getTeams(userId: string): Promise<JsonHandlerResult>;
export declare function getTeamMembers(teamId: string, userId: string): Promise<JsonHandlerResult>;
export declare function postTeamMembers(teamId: string, actingUserId: string, rawBody: unknown): Promise<JsonHandlerResult>;
//# sourceMappingURL=teams.d.ts.map