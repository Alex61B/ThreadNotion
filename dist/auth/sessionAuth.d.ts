import type { Request, Response, NextFunction } from 'express';
export type AuthedRequest = Request & {
    authUserId?: string;
};
export declare function requireAuthSession(): (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=sessionAuth.d.ts.map