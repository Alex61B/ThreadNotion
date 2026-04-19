import type { Request } from 'express';
export declare function requireStripeWebhookSecret(): string;
export declare function constructStripeEvent(req: Request): import("stripe/cjs/resources/Events").Event;
//# sourceMappingURL=webhook.d.ts.map