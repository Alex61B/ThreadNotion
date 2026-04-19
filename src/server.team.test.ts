import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./services/teamService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/teamService')>();
  return {
    ...actual,
    createTeam: vi.fn(),
    listTeamsForUser: vi.fn(),
    assertTeamManagerOrOwner: vi.fn(),
    assertTeamMember: vi.fn().mockResolvedValue(undefined),
    listTeamMembers: vi.fn(),
    addTeamMember: vi.fn(),
    ensureMemberOfTeam: vi.fn(),
    isTeamManagerOrOwner: vi.fn(),
  };
});

vi.mock('./services/teamTrainingAnalyticsService', () => ({
  buildTeamTrainingAnalytics: vi.fn(),
}));

vi.mock('./services/trainingAssignmentService', () => ({
  createTrainingAssignment: vi.fn(),
  listActiveAssignmentsForUser: vi.fn(),
}));

vi.mock('./services/userTrainingAnalyticsService', () => ({
  buildUserTrainingAnalytics: vi.fn(),
}));

vi.mock('./services/trainingRecommendationService', () => ({
  buildTrainingRecommendationBundle: vi.fn(),
}));

import { app } from './server';
import * as teamService from './services/teamService';
import { buildTeamTrainingAnalytics } from './services/teamTrainingAnalyticsService';
import {
  createTrainingAssignment,
  listActiveAssignmentsForUser,
} from './services/trainingAssignmentService';
import { buildUserTrainingAnalytics } from './services/userTrainingAnalyticsService';
import { buildTrainingRecommendationBundle } from './services/trainingRecommendationService';
const mockCreateTeam = vi.mocked(teamService.createTeam);
const mockListTeams = vi.mocked(teamService.listTeamsForUser);
const mockAssertManager = vi.mocked(teamService.assertTeamManagerOrOwner);
const mockAssertMember = vi.mocked(teamService.assertTeamMember);
const mockListMembers = vi.mocked(teamService.listTeamMembers);
const mockAddMember = vi.mocked(teamService.addTeamMember);
const mockEnsureMember = vi.mocked(teamService.ensureMemberOfTeam);
const mockBuildTeam = vi.mocked(buildTeamTrainingAnalytics);
const mockCreateAssignment = vi.mocked(createTrainingAssignment);
const mockListAssignments = vi.mocked(listActiveAssignmentsForUser);
const mockBuildUser = vi.mocked(buildUserTrainingAnalytics);
const mockBuildBundle = vi.mocked(buildTrainingRecommendationBundle);

describe('Phase 8 team routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertManager.mockResolvedValue(undefined);
    mockAssertMember.mockResolvedValue(undefined);
  });

  it('POST /teams creates team', async () => {
    mockCreateTeam.mockResolvedValue({
      id: 'team1',
      name: 'Sales',
      ownerId: 'u1',
      createdAt: new Date(),
    } as any);

    const res = await request(app).post('/teams').send({ name: 'Sales', userId: 'u1' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.team.id).toBe('team1');
  });

  it('GET /teams lists teams for user', async () => {
    mockListTeams.mockResolvedValue([
      { teamId: 't1', name: 'A', role: 'manager', ownerId: 'u1' },
    ]);

    const res = await request(app).get('/teams').query({ userId: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body.teams).toHaveLength(1);
  });

  it('GET /teams returns 400 without userId', async () => {
    const res = await request(app).get('/teams');
    expect(res.status).toBe(400);
  });

  it('GET /team/:teamId/analytics returns teamAnalytics', async () => {
    mockBuildTeam.mockResolvedValue({
      skills: [],
      totalSessions: 0,
    } as any);

    const res = await request(app).get('/team/t1/analytics').query({ userId: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.teamAnalytics).toBeDefined();
  });

  it('GET /training-assignments returns 400 without userId', async () => {
    const res = await request(app).get('/training-assignments');
    expect(res.status).toBe(400);
  });

  it('GET /training-assignments returns assignments', async () => {
    mockListAssignments.mockResolvedValue([
      {
        id: 'a1',
        teamId: 't1',
        assignedBy: 'm1',
        targetUserId: null,
        skill: 'closing',
        assignmentType: 'drill',
        active: true,
        createdAt: new Date(),
        team: { name: 'Team A' },
      } as any,
    ]);

    const res = await request(app).get('/training-assignments').query({ userId: 'rep1' });
    expect(res.status).toBe(200);
    expect(res.body.assignments).toHaveLength(1);
    expect(res.body.assignments[0].teamName).toBe('Team A');
  });

  it('POST /team/:teamId/assignments creates assignment', async () => {
    mockEnsureMember.mockResolvedValue(true);
    mockCreateAssignment.mockResolvedValue({
      id: 'as1',
      teamId: 't1',
      assignedBy: 'u1',
      targetUserId: null,
      skill: 'closing',
      assignmentType: 'drill',
      active: true,
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/team/t1/assignments')
      .send({ userId: 'u1', skill: 'closing', assignmentType: 'drill' });
    expect(res.status).toBe(201);
    expect(res.body.assignment.id).toBe('as1');
  });

  it('returns 403 when assertTeamManagerOrOwner throws', async () => {
    mockAssertManager.mockRejectedValue(new teamService.TeamAccessError('no', 403));

    const res = await request(app).get('/team/t1/members').query({ userId: 'u1' });
    expect(res.status).toBe(403);
  });

  it('GET /teams returns empty array when user has no teams', async () => {
    mockListTeams.mockResolvedValue([]);

    const res = await request(app).get('/teams').query({ userId: 'solo' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.teams).toEqual([]);
  });

  it('GET /team/:teamId/analytics returns 403 when caller is not a team member', async () => {
    mockAssertMember.mockRejectedValueOnce(
      new teamService.TeamAccessError('Not a team member', 403)
    );

    const res = await request(app).get('/team/t1/analytics').query({ userId: 'outsider' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(mockBuildTeam).not.toHaveBeenCalled();
  });

  it('GET /team/:teamId/members returns 404 when team does not exist', async () => {
    mockAssertManager.mockRejectedValueOnce(
      new teamService.TeamAccessError('Team not found', 404)
    );

    const res = await request(app).get('/team/missing/members').query({ userId: 'mgr' });
    expect(res.status).toBe(404);
    expect(mockListMembers).not.toHaveBeenCalled();
  });

  it('GET /team/:teamId/members returns 200 and member rows for manager', async () => {
    const joined = new Date('2026-01-02T00:00:00.000Z');
    mockListMembers.mockResolvedValue([
      {
        userId: 'r1',
        role: 'rep',
        displayName: 'Rep One',
        joinedAt: joined,
      },
    ] as any);

    const res = await request(app).get('/team/t1/members').query({ userId: 'mgr' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0]).toMatchObject({
      userId: 'r1',
      role: 'rep',
      displayName: 'Rep One',
      joinedAt: joined.toISOString(),
    });
  });

  it('POST /team/:teamId/members returns 403 when caller cannot manage team', async () => {
    mockAssertManager.mockRejectedValueOnce(
      new teamService.TeamAccessError('Not allowed to manage this team', 403)
    );

    const res = await request(app)
      .post('/team/t1/members')
      .query({ userId: 'repOnly' })
      .send({ memberUserId: 'new1' });
    expect(res.status).toBe(403);
    expect(mockAddMember).not.toHaveBeenCalled();
  });

  it('POST /team/:teamId/members returns 201 when manager adds a member', async () => {
    const joined = new Date('2026-03-01T12:00:00.000Z');
    mockAddMember.mockResolvedValue({
      userId: 'newRep',
      role: 'rep',
      displayName: null,
      joinedAt: joined,
    } as any);

    const res = await request(app)
      .post('/team/t1/members')
      .query({ userId: 'mgr' })
      .send({ memberUserId: 'newRep' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.member.userId).toBe('newRep');
    expect(res.body.member.joinedAt).toBe(joined.toISOString());
  });

  it('POST /team/:teamId/members returns 409 when seat limit reached', async () => {
    mockAddMember.mockRejectedValueOnce(new (teamService as any).TeamSeatLimitError());

    const res = await request(app)
      .post('/team/t1/members')
      .query({ userId: 'mgr' })
      .send({ memberUserId: 'newRep' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('TEAM_SEAT_LIMIT_REACHED');
  });

  it('POST /team/:teamId/members returns 409 when member already exists', async () => {
    mockAddMember.mockRejectedValueOnce({ code: 'P2002' });

    const res = await request(app)
      .post('/team/t1/members')
      .query({ userId: 'mgr' })
      .send({ memberUserId: 'dup' });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already a member');
  });

  it('POST /team/:teamId/assignments returns 403 when caller cannot manage team', async () => {
    mockAssertManager.mockRejectedValueOnce(
      new teamService.TeamAccessError('Not allowed to manage this team', 403)
    );

    const res = await request(app)
      .post('/team/t1/assignments')
      .send({ userId: 'repOnly', skill: 'closing', assignmentType: 'drill' });
    expect(res.status).toBe(403);
    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });

  it('POST /team/:teamId/assignments returns 400 when targetUserId is not on the team', async () => {
    mockEnsureMember.mockResolvedValue(false);

    const res = await request(app)
      .post('/team/t1/assignments')
      .send({
        userId: 'mgr',
        skill: 'closing',
        assignmentType: 'drill',
        targetUserId: 'notOnTeam',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('targetUserId');
    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });

  it('GET /team/:teamId/member-progress returns 400 without memberUserId', async () => {
    const res = await request(app).get('/team/t1/member-progress').query({ userId: 'mgr' });
    expect(res.status).toBe(400);
  });

  it('GET /team/:teamId/member-progress returns 403 when caller cannot manage team', async () => {
    mockAssertManager.mockRejectedValueOnce(
      new teamService.TeamAccessError('Not allowed to manage this team', 403)
    );

    const res = await request(app)
      .get('/team/t1/member-progress')
      .query({ userId: 'repOnly', memberUserId: 'r1' });
    expect(res.status).toBe(403);
    expect(mockBuildUser).not.toHaveBeenCalled();
  });

  it('GET /team/:teamId/member-progress returns 404 when memberUserId is not on the team', async () => {
    mockEnsureMember.mockResolvedValue(false);

    const res = await request(app)
      .get('/team/t1/member-progress')
      .query({ userId: 'mgr', memberUserId: 'ghost' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Member not on this team');
    expect(mockBuildUser).not.toHaveBeenCalled();
  });

  it('GET /team/:teamId/member-progress returns 200 with sparse analytics for a valid member', async () => {
    mockEnsureMember.mockResolvedValue(true);
    mockBuildUser.mockResolvedValue({
      skills: [],
      sessionsAnalyzed: 0,
      modes: [],
    } as any);
    mockBuildBundle.mockResolvedValue({
      progressSnapshot: null,
      drillSuggestion: null,
      trainingRecommendation: null,
      trainingFocusRow: null,
    } as any);

    const res = await request(app)
      .get('/team/t1/member-progress')
      .query({ userId: 'mgr', memberUserId: 'r1' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.analytics).toBeDefined();
    expect(res.body.trainingFocus).toBeNull();
    expect(res.body.orchestratedRecommendation).toBeUndefined();
  });

  it('GET /team/:teamId/member-progress includes orchestratedRecommendation when bundle provides it', async () => {
    mockEnsureMember.mockResolvedValue(true);
    mockBuildUser.mockResolvedValue({
      skills: [],
      sessionsAnalyzed: 0,
      modes: [],
    } as any);
    mockBuildBundle.mockResolvedValue({
      progressSnapshot: { skills: [], lowestSkills: [], recommendedFocusSkills: [], overallProgressSummary: 'S' },
      drillSuggestion: { primarySkill: 'closing', rationale: 'x' },
      trainingRecommendation: {
        recommendedMode: 'drill',
        primarySkill: 'closing',
        rationale: 'Drill closing.',
        sourceFactors: [],
      },
      trainingFocusRow: null,
      orchestratedRecommendation: {
        recommendedMode: 'drill',
        targetSkills: ['closing'],
        rationale: 'Drill closing.',
        source: 'weakness_engine',
        sourceFactors: [],
      },
    } as any);

    const res = await request(app)
      .get('/team/t1/member-progress')
      .query({ userId: 'mgr', memberUserId: 'r1' });
    expect(res.status).toBe(200);
    expect(res.body.orchestratedRecommendation?.targetSkills).toEqual(['closing']);
    expect(res.body.orchestratedRecommendation?.recommendedMode).toBe('drill');
  });
});
