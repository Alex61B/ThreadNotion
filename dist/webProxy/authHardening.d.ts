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
/**
 * True if any Auth.js / NextAuth session cookie is present, including chunked cookies
 * (e.g. authjs.session-token.0, .1, …).
 */
export declare function hasAnySessionCookieName(cookieNames: readonly string[]): boolean;
export declare function hasAuthSessionCookie(hasCookie: (name: string) => boolean): boolean;
/**
 * Parse Cookie header into a name → value map (last wins).
 */
export declare function parseCookieHeader(header: string | undefined): Record<string, string>;
/**
 * Resolve the database session token string from cookies (single or chunked).
 */
export declare function getSessionTokenFromParsedCookies(cookies: Record<string, string>): string | null;
//# sourceMappingURL=authHardening.d.ts.map