import type { Request } from 'express';
export declare function requireStripeWebhookSecret(): string;
/** Raw body + signature (Next.js route handlers, tests, etc.) */
export declare function constructStripeEventFromBuffer(body: Buffer, signature: string): import("stripe/cjs/resources/Events").Event;
export declare function constructStripeEvent(req: Request): import("stripe/cjs/resources/Events").Event;
//# sourceMappingURL=webhook.d.ts.map