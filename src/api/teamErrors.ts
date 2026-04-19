import { TeamAccessError, TeamSeatLimitError } from '../services/teamService';
import type { JsonHandlerResult } from './httpTypes';

/** Map team access errors to HTTP; return null if not a team access error */
export function teamAccessErrorToResult(e: unknown): JsonHandlerResult | null {
  if (e instanceof TeamAccessError) {
    if (e instanceof TeamSeatLimitError) {
      return { status: 409, body: { error: 'TEAM_SEAT_LIMIT_REACHED' } };
    }
    return { status: e.statusCode, body: { error: e.message } };
  }
  return null;
}
