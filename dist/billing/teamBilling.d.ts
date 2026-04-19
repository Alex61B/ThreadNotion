import type { TeamSeatBundle } from './planConfig';
export declare function createTeamCheckoutSession(args: {
    actingUserId: string;
    teamId: string;
    seatBundle: TeamSeatBundle;
}): Promise<{
    url: string;
}>;
export declare function createTeamPortalSession(args: {
    teamId: string;
}): Promise<{
    url: string;
}>;
//# sourceMappingURL=teamBilling.d.ts.map