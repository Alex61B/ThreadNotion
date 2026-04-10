"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveActingUserId = deriveActingUserId;
exports.hasAuthSessionCookie = hasAuthSessionCookie;
/**
 * Always prefer authenticated session identity over any client-provided userId.
 * This makes it easy to harden proxy routes against forged query/body userId.
 */
function deriveActingUserId(args) {
    const sessionUserId = args.session?.user?.id ?? null;
    if (typeof sessionUserId === 'string' && sessionUserId.trim())
        return sessionUserId;
    return null;
}
function hasAuthSessionCookie(hasCookie) {
    return (hasCookie('authjs.session-token') ||
        hasCookie('__Secure-authjs.session-token') ||
        hasCookie('next-auth.session-token') ||
        hasCookie('__Secure-next-auth.session-token'));
}
//# sourceMappingURL=authHardening.js.map