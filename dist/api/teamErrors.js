"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamAccessErrorToResult = teamAccessErrorToResult;
const teamService_1 = require("../services/teamService");
/** Map team access errors to HTTP; return null if not a team access error */
function teamAccessErrorToResult(e) {
    if (e instanceof teamService_1.TeamAccessError) {
        if (e instanceof teamService_1.TeamSeatLimitError) {
            return { status: 409, body: { error: 'TEAM_SEAT_LIMIT_REACHED' } };
        }
        return { status: e.statusCode, body: { error: e.message } };
    }
    return null;
}
//# sourceMappingURL=teamErrors.js.map