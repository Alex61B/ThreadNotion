import { z } from 'zod';
import type { JsonHandlerResult } from './httpTypes';

export function zodErrorResult(err: z.ZodError): JsonHandlerResult {
  return { status: 400, body: { error: 'Validation failed', details: err.flatten() } };
}
