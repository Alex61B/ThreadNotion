import type { LiveCoachingSuggestion } from '../schemas/liveCoaching';
/**
 * After a chat turn (user + assistant rows persisted), optionally compute a live coaching tip.
 */
export declare function getLiveCoachingAfterChatTurn(args: {
    conversationId: string;
    userId: string | null | undefined;
    liveCoachingEnabled: boolean;
    chatMode: 'roleplay' | 'assistant';
}): Promise<LiveCoachingSuggestion | null>;
//# sourceMappingURL=liveCoachingService.d.ts.map