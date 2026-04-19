import { z } from 'zod';
import { buildTrainingRecommendationBundle } from '../../services/trainingRecommendationService';
import { getOrchestratedRecommendationForUser } from '../../services/trainingOrchestrationService';
import { buildUserTrainingAnalytics } from '../../services/userTrainingAnalyticsService';
import { buildTeamTrainingAnalytics } from '../../services/teamTrainingAnalyticsService';
import {
  createTrainingAssignment,
  listActiveAssignmentsForUser,
} from '../../services/trainingAssignmentService';
import {
  clearTrainingFocus,
  getTrainingFocusForUser,
  upsertTrainingFocus,
} from '../../services/userTrainingFocusService';
import {
  assertTeamManagerOrOwner,
  assertTeamMember,
  ensureMemberOfTeam,
} from '../../services/teamService';
import { listWeaknessProfilesForUser } from '../../services/weaknessProfileService';
import { CreateAssignmentBodySchema } from '../../schemas/teamAnalytics';
import { SalesSkillSchema } from '../../schemas/coaching';
import { teamAccessErrorToResult } from '../teamErrors';
import type { JsonHandlerResult } from '../httpTypes';
import { zodErrorResult } from '../zodHttp';

const TrainingFocusPatchBody = z.object({
  focusSkills: z.array(SalesSkillSchema).max(3).min(1),
  sessionsRemaining: z.number().int().min(0).nullable().optional(),
  source: z.enum(['user', 'profile', 'progress']).optional(),
});

export async function getWeaknessProfile(userId: string): Promise<JsonHandlerResult> {
  const profiles = await listWeaknessProfilesForUser(userId);
  return {
    status: 200,
    body: {
      ok: true,
      profiles: profiles.map((p) => ({
        id: p.id,
        userId: p.userId,
        skill: p.skill,
        currentScore: p.currentScore,
        trendDirection: p.trendDirection,
        lastSimulationId: p.lastSimulationId,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    },
  };
}

export async function getUserProgress(userId: string): Promise<JsonHandlerResult> {
  const bundle = await buildTrainingRecommendationBundle(userId);
  const {
    progressSnapshot,
    drillSuggestion,
    trainingRecommendation,
    trainingFocusRow,
    orchestratedRecommendation,
  } = bundle;
  return {
    status: 200,
    body: {
      ok: true,
      progressSnapshot,
      drillSuggestion,
      trainingRecommendation,
      orchestratedRecommendation,
      trainingFocus: trainingFocusRow
        ? {
            focusSkills: trainingFocusRow.focusSkills,
            sessionsRemaining: trainingFocusRow.sessionsRemaining,
            source: trainingFocusRow.source,
            updatedAt: trainingFocusRow.updatedAt.toISOString(),
          }
        : null,
    },
  };
}

export async function getUserTrainingAnalytics(userId: string): Promise<JsonHandlerResult> {
  const analytics = await buildUserTrainingAnalytics(userId);
  return { status: 200, body: { ok: true, analytics } };
}

export async function getTrainingRecommendation(userId: string): Promise<JsonHandlerResult> {
  const recommendation = await getOrchestratedRecommendationForUser(userId);
  return { status: 200, body: { ok: true, recommendation } };
}

export async function getTrainingAssignments(userId: string): Promise<JsonHandlerResult> {
  const rows = await listActiveAssignmentsForUser(userId);
  return {
    status: 200,
    body: {
      ok: true,
      assignments: rows.map((a) => ({
        id: a.id,
        teamId: a.teamId,
        teamName: a.team.name,
        skill: a.skill,
        assignmentType: a.assignmentType,
        targetUserId: a.targetUserId,
        createdAt: a.createdAt.toISOString(),
      })),
    },
  };
}

export async function getTrainingFocus(userId: string): Promise<JsonHandlerResult> {
  const row = await getTrainingFocusForUser(userId);
  if (!row) {
    return { status: 200, body: { ok: true, trainingFocus: null } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      trainingFocus: {
        focusSkills: row.focusSkills,
        sessionsRemaining: row.sessionsRemaining,
        source: row.source,
        updatedAt: row.updatedAt.toISOString(),
      },
    },
  };
}

export async function patchTrainingFocus(userId: string, rawBody: unknown): Promise<JsonHandlerResult> {
  let body: z.infer<typeof TrainingFocusPatchBody>;
  try {
    body = TrainingFocusPatchBody.parse(rawBody);
  } catch (e) {
    if (e instanceof z.ZodError) return zodErrorResult(e);
    throw e;
  }
  const row = await upsertTrainingFocus({
    userId,
    focusSkills: body.focusSkills,
    ...(body.sessionsRemaining !== undefined ? { sessionsRemaining: body.sessionsRemaining } : {}),
    ...(body.source !== undefined ? { source: body.source } : {}),
  });
  return {
    status: 200,
    body: {
      ok: true,
      trainingFocus: {
        focusSkills: row.focusSkills,
        sessionsRemaining: row.sessionsRemaining,
        source: row.source,
        updatedAt: row.updatedAt.toISOString(),
      },
    },
  };
}

export async function deleteTrainingFocus(userId: string): Promise<JsonHandlerResult> {
  await clearTrainingFocus(userId);
  return { status: 200, body: { ok: true } };
}

export async function getTeamAnalytics(teamId: string, userId: string): Promise<JsonHandlerResult> {
  try {
    await assertTeamMember(teamId, userId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }
  const teamAnalytics = await buildTeamTrainingAnalytics(teamId);
  return { status: 200, body: { ok: true, teamAnalytics } };
}

export async function getTeamMemberProgress(
  teamId: string,
  managerUserId: string,
  memberUserId: string
): Promise<JsonHandlerResult> {
  try {
    await assertTeamManagerOrOwner(teamId, managerUserId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }
  const onTeam = await ensureMemberOfTeam(teamId, memberUserId);
  if (!onTeam) {
    return { status: 404, body: { error: 'Member not on this team' } };
  }
  const analytics = await buildUserTrainingAnalytics(memberUserId);
  const bundle = await buildTrainingRecommendationBundle(memberUserId);
  const {
    progressSnapshot,
    drillSuggestion,
    trainingRecommendation,
    trainingFocusRow,
    orchestratedRecommendation,
  } = bundle;
  return {
    status: 200,
    body: {
      ok: true,
      analytics,
      progressSnapshot,
      drillSuggestion,
      trainingRecommendation,
      orchestratedRecommendation,
      trainingFocus: trainingFocusRow
        ? {
            focusSkills: trainingFocusRow.focusSkills,
            sessionsRemaining: trainingFocusRow.sessionsRemaining,
            source: trainingFocusRow.source,
            updatedAt: trainingFocusRow.updatedAt.toISOString(),
          }
        : null,
    },
  };
}

export async function postTeamAssignment(
  teamId: string,
  rawBody: unknown
): Promise<JsonHandlerResult> {
  const body = CreateAssignmentBodySchema.safeParse(rawBody);
  if (!body.success) {
    return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
  }
  try {
    await assertTeamManagerOrOwner(teamId, body.data.userId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }
  if (body.data.targetUserId) {
    const ok = await ensureMemberOfTeam(teamId, body.data.targetUserId);
    if (!ok) {
      return { status: 400, body: { error: 'targetUserId must be a member of the team' } };
    }
  }
  const row = await createTrainingAssignment({
    teamId,
    assignedBy: body.data.userId,
    targetUserId: body.data.targetUserId ?? null,
    skill: body.data.skill,
    assignmentType: body.data.assignmentType,
  });
  return {
    status: 201,
    body: {
      ok: true,
      assignment: {
        id: row.id,
        teamId: row.teamId,
        skill: row.skill,
        assignmentType: row.assignmentType,
        targetUserId: row.targetUserId,
        active: row.active,
        createdAt: row.createdAt.toISOString(),
      },
    },
  };
}
