"use strict";
/**
 * Typed errors for the coaching evaluation pipeline (LLM parse + schema validation).
 * Route handlers map these to HTTP 400 with structured JSON bodies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationError = void 0;
exports.isEvaluationError = isEvaluationError;
class EvaluationError extends Error {
    constructor(message, code, cause) {
        super(message);
        this.cause = cause;
        this.name = 'EvaluationError';
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.EvaluationError = EvaluationError;
function isEvaluationError(e) {
    return e instanceof EvaluationError;
}
//# sourceMappingURL=evaluationErrors.js.map