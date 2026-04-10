/**
 * Typed errors for the coaching evaluation pipeline (LLM parse + schema validation).
 * Route handlers map these to HTTP 400 with structured JSON bodies.
 */
export type EvaluationErrorCode = 'EVALUATOR_PARSE' | 'EVALUATOR_VALIDATION';
export declare class EvaluationError extends Error {
    readonly cause?: unknown | undefined;
    readonly code: EvaluationErrorCode;
    constructor(message: string, code: EvaluationErrorCode, cause?: unknown | undefined);
}
export declare function isEvaluationError(e: unknown): e is EvaluationError;
//# sourceMappingURL=evaluationErrors.d.ts.map