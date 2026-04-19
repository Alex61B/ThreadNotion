"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = getHealth;
const db_1 = require("../../db");
async function getHealth() {
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        return {
            status: 200,
            body: { ok: true, db: 'connected', timestamp: new Date().toISOString() },
        };
    }
    catch {
        return { status: 500, body: { ok: false, db: 'disconnected' } };
    }
}
//# sourceMappingURL=health.js.map