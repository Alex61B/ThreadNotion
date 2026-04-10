import type { PrismaClient } from '../../generated/prisma';
export type LinkAnonymousResult = {
    ok: true;
    status: 'noop_same_id';
} | {
    ok: true;
    status: 'already_linked';
} | {
    ok: false;
    status: 'claimed_by_other';
} | {
    ok: true;
    status: 'linked';
};
/**
 * Move anonymous (localStorage UUID) training/team rows onto an authenticated User.id.
 * Idempotent per anonymousUserId via AnonymousIdentityClaim.
 */
export declare function linkAnonymousToAuth(prisma: PrismaClient, args: {
    anonymousUserId: string;
    authUserId: string;
}): Promise<LinkAnonymousResult>;
//# sourceMappingURL=anonymousUserLinkService.d.ts.map