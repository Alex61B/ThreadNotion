"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuthSession = requireAuthSession;
const db_1 = require("../db");
const authHardening_1 = require("../webProxy/authHardening");
async function getUserIdFromSession(req) {
    const cookies = (0, authHardening_1.parseCookieHeader)(req.headers.cookie);
    const token = (0, authHardening_1.getSessionTokenFromParsedCookies)(cookies);
    if (!token)
        return null;
    const session = await db_1.prisma.session.findUnique({ where: { sessionToken: token } });
    if (!session)
        return null;
    if (session.expires.getTime() <= Date.now())
        return null;
    return session.userId;
}
function requireAuthSession() {
    return async (req, res, next) => {
        try {
            const userId = await getUserIdFromSession(req);
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            req.authUserId = userId;
            return next();
        }
        catch (e) {
            return next(e);
        }
    };
}
//# sourceMappingURL=sessionAuth.js.map