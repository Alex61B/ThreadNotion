import {
  addTeamMember,
  assertTeamManagerOrOwner,
  createTeam,
  listTeamMembers,
  listTeamsForUser,
} from '../../services/teamService';
import { AddTeamMemberBodySchema, CreateTeamBodySchema } from '../../schemas/teamAnalytics';
import { teamAccessErrorToResult } from '../teamErrors';
import type { JsonHandlerResult } from '../httpTypes';

export async function postTeams(rawBody: unknown): Promise<JsonHandlerResult> {
  const body = CreateTeamBodySchema.safeParse(rawBody);
  if (!body.success) {
    return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
  }
  const team = await createTeam(body.data.name, body.data.userId);
  return {
    status: 201,
    body: { ok: true, team: { id: team.id, name: team.name, ownerId: team.ownerId } },
  };
}

export async function getTeams(userId: string): Promise<JsonHandlerResult> {
  const teams = await listTeamsForUser(userId);
  return { status: 200, body: { ok: true, teams } };
}

export async function getTeamMembers(teamId: string, userId: string): Promise<JsonHandlerResult> {
  try {
    await assertTeamManagerOrOwner(teamId, userId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }
  const members = await listTeamMembers(teamId);
  return {
    status: 200,
    body: {
      ok: true,
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        displayName: m.displayName,
        joinedAt: m.joinedAt.toISOString(),
      })),
    },
  };
}

export async function postTeamMembers(
  teamId: string,
  actingUserId: string,
  rawBody: unknown
): Promise<JsonHandlerResult> {
  const body = AddTeamMemberBodySchema.safeParse(rawBody);
  if (!body.success) {
    return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
  }
  try {
    await assertTeamManagerOrOwner(teamId, actingUserId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }
  try {
    const m = await addTeamMember({
      teamId,
      memberUserId: body.data.memberUserId,
      ...(body.data.role !== undefined ? { role: body.data.role } : {}),
      ...(body.data.displayName !== undefined ? { displayName: body.data.displayName } : {}),
    });
    return {
      status: 201,
      body: {
        ok: true,
        member: {
          userId: m.userId,
          role: m.role,
          displayName: m.displayName,
          joinedAt: m.joinedAt.toISOString(),
        },
      },
    };
  } catch (err: unknown) {
    const mapped = teamAccessErrorToResult(err);
    if (mapped) return mapped;
    const anyErr = err as { code?: string };
    if (anyErr?.code === 'P2002') {
      return { status: 409, body: { error: 'User is already a member of this team' } };
    }
    throw err;
  }
}
