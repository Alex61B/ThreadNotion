"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAssignmentBodySchema = exports.AddTeamMemberBodySchema = exports.CreateTeamBodySchema = exports.TeamAnalyticsSchema = exports.TeamSkillAnalyticsSchema = void 0;
const zod_1 = require("zod");
const coaching_1 = require("./coaching");
exports.TeamSkillAnalyticsSchema = zod_1.z.object({
    skill: coaching_1.SalesSkillSchema,
    averageScore: zod_1.z.number(),
    weakestUsers: zod_1.z.array(zod_1.z.string()),
    strongestUsers: zod_1.z.array(zod_1.z.string()),
});
exports.TeamAnalyticsSchema = zod_1.z.object({
    skills: zod_1.z.array(exports.TeamSkillAnalyticsSchema),
    teamWeakestSkill: coaching_1.SalesSkillSchema.optional(),
    teamStrongestSkill: coaching_1.SalesSkillSchema.optional(),
    averageProgress: zod_1.z.number().optional(),
    totalSessions: zod_1.z.number().int().min(0),
});
exports.CreateTeamBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    userId: zod_1.z.string().min(1),
});
exports.AddTeamMemberBodySchema = zod_1.z.object({
    memberUserId: zod_1.z.string().min(1),
    role: zod_1.z.enum(['manager', 'rep']).optional(),
    displayName: zod_1.z.string().max(200).optional(),
});
exports.CreateAssignmentBodySchema = zod_1.z.object({
    skill: coaching_1.SalesSkillSchema,
    assignmentType: zod_1.z.enum(['drill', 'adaptive']),
    targetUserId: zod_1.z.string().min(1).optional(),
    userId: zod_1.z.string().min(1),
});
//# sourceMappingURL=teamAnalytics.js.map