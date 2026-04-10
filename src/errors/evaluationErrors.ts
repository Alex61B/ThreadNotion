/**
 * Typed errors for the coaching evaluation pipeline (LLM parse + schema validation).
 * Route handlers map these to HTTP 400 with structured JSON bodies.
 */

export type EvaluationErrorCode = 'EVALUATOR_PARSE' | 'EVALUATOR_VALIDATION';

export class EvaluationError extends Error {
  readonly code: EvaluationErrorCode;

  constructor(
    message: string,
    code: EvaluationErrorCode,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EvaluationError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isEvaluationError(e: unknown): e is EvaluationError {
  return e instanceof EvaluationError;
}
