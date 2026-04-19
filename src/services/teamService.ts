import type { Prisma } from '../../generated/prisma';
import { prisma } from '../db';
import { maxSeatsFromBundle } from '../billing/teamEntitlements';

export class TeamAccessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 403 | 404 | 409
  ) {
    super(message);
    this.name = 'TeamAccessError';
  }
}

export class TeamSeatLimitError extends TeamAccessError {
  constructor() {
    super('Team seat limit reached', 403);
    this.name = 'TeamSeatLimitError';
  }
}

export class UserMultiTeamNotAllowedError extends TeamAccessError {
  constructor() {
    super('User is already a member of another team', 409);
    this.name = 'UserMultiTeamNotAllowedError';
  }
}

export async function createTeam(name: string, ownerId: string) {
  const team = await prisma.team.create({
    data: {
      name,
      ownerId,
      members: {
        create: {
          userId: ownerId,
          role: 'manager',
        },
      },
    },
  });
  return team;
}

export async function listTeamsForUser(userId: string) {
  const rows = await prisma.teamMember.findMany({
    where: { userId },
    include: { team: true },
    orderBy: { joinedAt: 'asc' },
  });
  return rows.map((r) => ({
    teamId: r.teamId,
    name: r.team.name,
    role: r.role,
    ownerId: r.team.ownerId,
  }));
}

export async function getTeam(teamId: string) {
  return prisma.team.findUnique({ where: { id: teamId } });
}

export async function listTeamMembers(teamId: string) {
  return prisma.teamMember.findMany({
    where: { teamId },
    orderBy: { joinedAt: 'asc' },
  });
}

export async function isTeamManagerOrOwner(teamId: string, userId: string): Promise<boolean> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return false;
  if (team.ownerId === userId) return true;
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return m?.role === 'manager';
}

export async function assertTeamManagerOrOwner(teamId: string, userId: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new TeamAccessError('Team not found', 404);
  }
  const ok = await isTeamManagerOrOwner(teamId, userId);
  if (!ok) {
    throw new TeamAccessError('Not allowed to manage this team', 403);
  }
}

export async function assertTeamMember(teamId: string, userId: string): Promise<void> {
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!m) {
    throw new TeamAccessError('Not a team member', 403);
  }
}

export async function addTeamMember(args: {
  teamId: string;
  memberUserId: string;
  role?: Prisma.TeamMemberCreateInput['role'];
  displayName?: string;
}) {
  // MVP constraint: each user may belong to at most one team.
  const existingMembership = await prisma.teamMember.findFirst({
    where: { userId: args.memberUserId, NOT: { teamId: args.teamId } },
  });
  if (existingMembership) {
    throw new UserMultiTeamNotAllowedError();
  }

  // Seat enforcement (MVP): if team has an active paid TEAM subscription, block joins at seat limit.
  const billing = await prisma.billingAccount.findUnique({ where: { teamId: args.teamId } });
  if (billing) {
    const sub = await prisma.subscription.findUnique({ where: { billingAccountId: billing.id } });
    if (sub && (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') && sub.planType === 'TEAM') {
      const maxSeats = maxSeatsFromBundle(sub.seatBundle);
      if (maxSeats > 0) {
        const activeCount = await prisma.teamMember.count({ where: { teamId: args.teamId } });
        if (activeCount >= maxSeats) {
          throw new TeamSeatLimitError();
        }
      }
    }
  }

  return prisma.teamMember.create({
    data: {
      teamId: args.teamId,
      userId: args.memberUserId,
      role: args.role ?? 'rep',
      displayName: args.displayName ?? null,
    },
  });
}

export async function ensureMemberOfTeam(teamId: string, memberUserId: string): Promise<boolean> {
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: memberUserId } },
  });
  return !!m;
}
