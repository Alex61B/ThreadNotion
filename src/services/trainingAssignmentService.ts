import type { SalesSkill } from '../schemas/coaching';
import { prisma } from '../db';
import { assertTeamManagerOrOwner } from './teamService';

export type AssignmentType = 'drill' | 'adaptive';

export async function createTrainingAssignment(args: {
  teamId: string;
  assignedBy: string;
  targetUserId?: string | null;
  skill: SalesSkill;
  assignmentType: AssignmentType;
}) {
  return prisma.trainingAssignment.create({
    data: {
      teamId: args.teamId,
      assignedBy: args.assignedBy,
      targetUserId: args.targetUserId ?? null,
      skill: args.skill,
      assignmentType: args.assignmentType,
      active: true,
    },
    include: { team: true },
  });
}

export async function listAssignmentsForTeam(teamId: string) {
  return prisma.trainingAssignment.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    include: { team: true },
  });
}

/** Active assignments visible to this user (direct or team-wide for teams they belong to). */
export async function listActiveAssignmentsForUser(userId: string) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);
  if (teamIds.length === 0) return [];

  const rows = await prisma.trainingAssignment.findMany({
    where: {
      active: true,
      teamId: { in: teamIds },
      OR: [{ targetUserId: userId }, { targetUserId: null }],
    },
    orderBy: { createdAt: 'desc' },
    include: { team: true },
  });

  return rows;
}

export async function deactivateTrainingAssignment(id: string, teamId: string, managerUserId: string) {
  await assertTeamManagerOrOwner(teamId, managerUserId);
  await prisma.trainingAssignment.updateMany({
    where: { id, teamId },
    data: { active: false },
  });
}
