"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodErrorResult = zodErrorResult;
function zodErrorResult(err) {
    return { status: 400, body: { error: 'Validation failed', details: err.flatten() } };
}
//# sourceMappingURL=zodHttp.js.map