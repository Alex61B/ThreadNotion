import type { JsonHandlerResult } from '../httpTypes';
export declare function postUserBillingCheckoutSession(rawBody: unknown): Promise<JsonHandlerResult>;
export declare function postUserBillingPortalSession(rawBody: unknown): Promise<JsonHandlerResult>;
export declare function postUserBillingCancel(userId: string): Promise<JsonHandlerResult>;
export declare function getUserBillingInvoices(userId: string): Promise<JsonHandlerResult>;
export declare function getUserBillingStatus(userId: string): Promise<JsonHandlerResult>;
export declare function postTeamBillingCheckoutSession(teamId: string, actingUserId: string, rawBody: unknown): Promise<JsonHandlerResult>;
export declare function postTeamBillingPortalSession(teamId: string, actingUserId: string): Promise<JsonHandlerResult>;
export declare function postTeamBillingCancel(teamId: string, actingUserId: string): Promise<JsonHandlerResult>;
export declare function getTeamBillingStatus(teamId: string, actingUserId: string): Promise<JsonHandlerResult>;
export declare function getTeamBillingInvoices(teamId: string, actingUserId: string): Promise<JsonHandlerResult>;
//# sourceMappingURL=billing.d.ts.map