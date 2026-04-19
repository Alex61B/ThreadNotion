export const dynamic = 'force-dynamic';

import { getConversationEvaluationSummary } from '@server/api/handlers/conversations';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

type Params = { params: { conversationId: string } };

export async function GET(_req: Request, { params }: Params) {
  const r = await getConversationEvaluationSummary(params.conversationId);
  return nextFromHandlerResult(r);
}
