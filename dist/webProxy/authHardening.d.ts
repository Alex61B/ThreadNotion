export type MinimalSession = {
    user?: {
        id?: string | null;
    } | null;
} | null | undefined;
/**
 * Always prefer authenticated session identity over any client-provided userId.
 * This makes it easy to harden proxy routes against forged query/body userId.
 */
export declare function deriveActingUserId(args: {
    session: MinimalSession;
    clientProvidedUserId?: string | null;
}): string | null;
export declare function hasAuthSessionCookie(hasCookie: (name: string) => boolean): boolean;
//# sourceMappingURL=authHardening.d.ts.map