import type { Prisma } from '../../generated/prisma';
export declare class TeamAccessError extends Error {
    readonly statusCode: 403 | 404;
    constructor(message: string, statusCode: 403 | 404);
}
export declare function createTeam(name: string, ownerId: string): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    ownerId: string;
}>;
export declare function listTeamsForUser(userId: string): Promise<{
    teamId: string;
    name: string;
    role: import("../../generated/prisma").$Enums.TeamMemberRole;
    ownerId: string;
}[]>;
export declare function getTeam(teamId: string): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    ownerId: string;
} | null>;
export declare function listTeamMembers(teamId: string): Promise<{
    id: string;
    userId: string;
    role: import("../../generated/prisma").$Enums.TeamMemberRole;
    displayName: string | null;
    joinedAt: Date;
    teamId: string;
}[]>;
export declare function isTeamManagerOrOwner(teamId: string, userId: string): Promise<boolean>;
export declare function assertTeamManagerOrOwner(teamId: string, userId: string): Promise<void>;
export declare function assertTeamMember(teamId: string, userId: string): Promise<void>;
export declare function addTeamMember(args: {
    teamId: string;
    memberUserId: string;
    role?: Prisma.TeamMemberCreateInput['role'];
    displayName?: string;
}): Promise<{
    id: string;
    userId: string;
    role: import("../../generated/prisma").$Enums.TeamMemberRole;
    displayName: string | null;
    joinedAt: Date;
    teamId: string;
}>;
export declare function ensureMemberOfTeam(teamId: string, memberUserId: string): Promise<boolean>;
//# sourceMappingURL=teamService.d.ts.map