import type { ModeAnalytics } from '../../schemas/trainingAnalytics';
import type { GradedSessionScores } from './types';

const MODES = ['generic', 'adaptive', 'drill'] as const;

function meanSessionScore(s: GradedSessionScores): number {
  const vals = Object.values(s.scores);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function computeModeAnalytics(sessions: GradedSessionScores[]): ModeAnalytics[] {
  const counts: Record<(typeof MODES)[number], number> = {
    generic: 0,
    adaptive: 0,
    drill: 0,
  };
  for (const s of sessions) {
    counts[s.mode] += 1;
  }

  const deltasByMode: Record<(typeof MODES)[number], number[]> = {
    generic: [],
    adaptive: [],
    drill: [],
  };

  for (let i = 0; i < sessions.length - 1; i++) {
    const cur = sessions[i]!;
    const next = sessions[i + 1]!;
    const mode = cur.mode;
    const delta = meanSessionScore(next) - meanSessionScore(cur);
    deltasByMode[mode].push(delta);
  }

  return MODES.map((mode) => {
    const sessionCount = counts[mode];
    const arr = deltasByMode[mode];
    let averageScoreImprovement: number | undefined;
    if (arr.length > 0) {
      averageScoreImprovement =
        arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    return {
      mode,
      sessionCount,
      averageScoreImprovement,
    };
  });
}
