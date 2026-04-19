import type { SalesSkill } from '../schemas/coaching';
export type AssignmentType = 'drill' | 'adaptive';
export declare function createTrainingAssignment(args: {
    teamId: string;
    assignedBy: string;
    targetUserId?: string | null;
    skill: SalesSkill;
    assignmentType: AssignmentType;
}): Promise<{
    team: {
        id: string;
        name: string;
        createdAt: Date;
        ownerId: string;
    };
} & {
    id: string;
    createdAt: Date;
    teamId: string;
    skill: import("../../generated/prisma").$Enums.SalesSkill;
    assignedBy: string;
    targetUserId: string | null;
    assignmentType: import("../../generated/prisma").$Enums.TrainingAssignmentType;
    active: boolean;
}>;
export declare function listAssignmentsForTeam(teamId: string): Promise<({
    team: {
        id: string;
        name: string;
        createdAt: Date;
        ownerId: string;
    };
} & {
    id: string;
    createdAt: Date;
    teamId: string;
    skill: import("../../generated/prisma").$Enums.SalesSkill;
    assignedBy: string;
    targetUserId: string | null;
    assignmentType: import("../../generated/prisma").$Enums.TrainingAssignmentType;
    active: boolean;
})[]>;
/** Active assignments visible to this user (direct or team-wide for teams they belong to). */
export declare function listActiveAssignmentsForUser(userId: string): Promise<({
    team: {
        id: string;
        name: string;
        createdAt: Date;
        ownerId: string;
    };
} & {
    id: string;
    createdAt: Date;
    teamId: string;
    skill: import("../../generated/prisma").$Enums.SalesSkill;
    assignedBy: string;
    targetUserId: string | null;
    assignmentType: import("../../generated/prisma").$Enums.TrainingAssignmentType;
    active: boolean;
})[]>;
export declare function deactivateTrainingAssignment(id: string, teamId: string, managerUserId: string): Promise<void>;
//# sourceMappingURL=trainingAssignmentService.d.ts.map