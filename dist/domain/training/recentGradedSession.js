"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consecutiveDrillStreakForSkill = consecutiveDrillStreakForSkill;
exports.stagnationSameLowest = stagnationSameLowest;
exports.sessionsSinceLastTouchedSkill = sessionsSinceLastTouchedSkill;
exports.lastPracticedSkillFromSessions = lastPracticedSkillFromSessions;
/** Count consecutive drills (from newest) targeting the same primary skill. */
function consecutiveDrillStreakForSkill(sessions, skill) {
    let n = 0;
    for (const s of sessions) {
        if (s.simulationMode !== 'drill')
            break;
        if (s.drillPrimarySkill === skill)
            n += 1;
        else
            break;
    }
    return n;
}
/** True if the last N sessions share the same lowest skill (when all have lowestSkillInSession). */
function stagnationSameLowest(sessions, n) {
    const slice = sessions.slice(0, n);
    if (slice.length < n)
        return null;
    const lows = slice.map((s) => s.lowestSkillInSession).filter(Boolean);
    if (lows.length < n)
        return null;
    const first = lows[0];
    return lows.every((x) => x === first) ? first : null;
}
function sessionTouchesSkill(session, skill) {
    if (session.drillPrimarySkill === skill || session.drillSecondarySkill === skill)
        return true;
    if (session.adaptiveTargetWeaknesses.includes(skill))
        return true;
    if (session.lowestSkillInSession === skill)
        return true;
    return false;
}
/**
 * Sessions are newest-first. Returns how many graded sessions sit above the last time `skill`
 * was practiced in drill/adaptive/lowest-skill context. 0 = touched in the latest session.
 */
function sessionsSinceLastTouchedSkill(sessions, skill) {
    for (let i = 0; i < sessions.length; i++) {
        if (sessionTouchesSkill(sessions[i], skill))
            return i;
    }
    return sessions.length;
}
/** Primary focus skill from the most recent graded session, if inferable. */
function lastPracticedSkillFromSessions(sessions) {
    const s = sessions[0];
    if (!s)
        return undefined;
    if (s.simulationMode === 'drill' && s.drillPrimarySkill)
        return s.drillPrimarySkill;
    if (s.adaptiveTargetWeaknesses.length > 0)
        return s.adaptiveTargetWeaknesses[0];
    return s.lowestSkillInSession;
}
//# sourceMappingURL=recentGradedSession.js.map