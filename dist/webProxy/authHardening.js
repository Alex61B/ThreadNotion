"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveActingUserId = deriveActingUserId;
exports.hasAnySessionCookieName = hasAnySessionCookieName;
exports.hasAuthSessionCookie = hasAuthSessionCookie;
exports.parseCookieHeader = parseCookieHeader;
exports.getSessionTokenFromParsedCookies = getSessionTokenFromParsedCookies;
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
const SESSION_COOKIE_BASE_NAMES = [
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
];
/**
 * True if any Auth.js / NextAuth session cookie is present, including chunked cookies
 * (e.g. authjs.session-token.0, .1, …).
 */
function hasAnySessionCookieName(cookieNames) {
    const set = new Set(cookieNames);
    for (const base of SESSION_COOKIE_BASE_NAMES) {
        if (set.has(base))
            return true;
        if (cookieNames.some((n) => n === `${base}.0` || n.startsWith(`${base}.`)))
            return true;
    }
    return false;
}
function hasAuthSessionCookie(hasCookie) {
    return SESSION_COOKIE_BASE_NAMES.some((base) => {
        if (hasCookie(base))
            return true;
        // Chunked session cookies: base.0, base.1, …
        for (let i = 0; i < 12; i++) {
            if (hasCookie(`${base}.${i}`))
                return true;
        }
        return false;
    });
}
/**
 * Parse Cookie header into a name → value map (last wins).
 */
function parseCookieHeader(header) {
    if (!header)
        return {};
    const out = {};
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1)
            continue;
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        if (!k)
            continue;
        try {
            out[k] = decodeURIComponent(v);
        }
        catch {
            out[k] = v;
        }
    }
    return out;
}
/**
 * Resolve the database session token string from cookies (single or chunked).
 */
function getSessionTokenFromParsedCookies(cookies) {
    for (const base of SESSION_COOKIE_BASE_NAMES) {
        const direct = cookies[base];
        if (typeof direct === 'string' && direct.length > 0)
            return direct;
        const chunkKeys = Object.keys(cookies)
            .filter((k) => k.startsWith(`${base}.`))
            .sort((a, b) => {
            const sa = a.slice(base.length + 1);
            const sb = b.slice(base.length + 1);
            const na = parseInt(sa, 10);
            const nb = parseInt(sb, 10);
            if (!Number.isNaN(na) && !Number.isNaN(nb))
                return na - nb;
            return sa.localeCompare(sb);
        });
        if (chunkKeys.length > 0) {
            const joined = chunkKeys.map((k) => cookies[k] ?? '').join('');
            if (joined.length > 0)
                return joined;
        }
    }
    return null;
}
//# sourceMappingURL=authHardening.js.map