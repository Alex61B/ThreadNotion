'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

// Web Speech API — not in all TS DOM lib versions
declare global {
  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    maxAlternatives: number;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: Event) => void) | null;
    onend: ((e: Event) => void) | null;
    start(): void;
    stop(): void;
  }
  const SpeechRecognition: { new (): SpeechRecognition };
  interface Window {
    SpeechRecognition: typeof SpeechRecognition | undefined;
    webkitSpeechRecognition: typeof SpeechRecognition | undefined;
  }
}

// =============================================================================
// TYPES
// =============================================================================

type Persona = {
  id: string;
  name: string;
  tone: string | null;
  values: string | null;
  instructions: string;
  createdAt: string;
};

type Product = {
  id: string;
  name: string;
  title?: string;
  description: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  sku: string;
  attributes: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type Evaluation = {
  id: string;
  conversationId: string;
  storytelling: number;
  emotional: number;
  persuasion: number;
  productKnow: number;
  total: number;
  strengths: string;
  tips: string;
  createdAt: string;
};

type SalesSkillKey =
  | 'discovery_questions'
  | 'objection_handling'
  | 'product_knowledge'
  | 'closing'
  | 'storytelling'
  | 'empathy';

type CoachingSkillScore = {
  id: string;
  skill: SalesSkillKey;
  score: number;
  reasoning: string;
  createdAt: string;
};

type CoachingFeedbackPayload = {
  strengths: { skill: SalesSkillKey; explanation: string }[];
  improvementAreas: { skill: SalesSkillKey; explanation: string }[];
  keyMoments: {
    skill: SalesSkillKey;
    customerMessage?: string;
    userMessage?: string;
    whyItMatters: string;
    suggestedApproach: string;
  }[];
  nextTimeFocus: string[];
  overallCoachingSummary: string;
};

type CoachingSummary = {
  id: string;
  conversationId: string;
  questionCount: number;
  avgMessageLength: number;
  talkRatio: number;
  weaknesses: string[];
  recommendedTips: string[];
  createdAt: string;
  /** Phase 3 narrative coaching; absent for older graded sessions. */
  coachingFeedback?: CoachingFeedbackPayload | null;
};

type WeaknessProfileRow = {
  id: string;
  userId: string;
  skill: SalesSkillKey;
  currentScore: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  lastSimulationId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Phase 4A: aggregated profile + simulation deltas from POST /feedback or GET /user-progress. */
type SkillProgressRow = {
  skill: SalesSkillKey;
  currentScore: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  latestSimulationScore?: number;
  previousSimulationScore?: number;
  latestDelta?: number;
};

type ProgressSnapshot = {
  skills: SkillProgressRow[];
  lowestSkills: SalesSkillKey[];
  recommendedFocusSkills: SalesSkillKey[];
  recommendedFocusMessage?: string;
  overallProgressSummary: string;
};

/** GET /user-progress + POST /feedback (Phase 5). */
type TrainingRecommendationPayload = {
  recommendedMode: 'generic' | 'adaptive' | 'drill';
  primarySkill?: SalesSkillKey;
  secondarySkill?: SalesSkillKey;
  rationale: string;
  confidence?: 'high' | 'medium' | 'low';
  sourceFactors: string[];
};

/** Phase 9: orchestrated next step (manager override, mastery, spaced repetition). */
type OrchestratedRecommendationPayload = {
  recommendedMode: 'generic' | 'adaptive' | 'drill';
  targetSkills: SalesSkillKey[];
  rationale: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  source?:
    | 'manager_assignment'
    | 'training_focus'
    | 'weakness_engine'
    | 'spaced_repetition'
    | 'mastery_adjustment'
    | 'generic_fallback';
  confidence?: 'high' | 'medium' | 'low';
  sourceFactors: string[];
};

/** GET /user-training-analytics (Phase 7). */
type TrainingAnalyticsPayload = {
  skills: Array<{
    skill: SalesSkillKey;
    averageScore: number;
    recentAverageScore: number;
    improvementRate: number;
    weaknessFrequency: number;
    lastSeenWeakness?: number;
    trendScores?: number[];
  }>;
  modes: Array<{
    mode: 'generic' | 'adaptive' | 'drill';
    sessionCount: number;
    averageScoreImprovement?: number;
  }>;
  strongestSkill?: SalesSkillKey;
  weakestSkill?: SalesSkillKey;
  mostImprovedSkill?: SalesSkillKey;
  persistentWeakness?: SalesSkillKey;
  sessionsAnalyzed: number;
};

/** Phase 8 team analytics API. */
type TeamAnalyticsPayload = {
  skills: Array<{
    skill: SalesSkillKey;
    averageScore: number;
    weakestUsers: string[];
    strongestUsers: string[];
  }>;
  teamWeakestSkill?: SalesSkillKey;
  teamStrongestSkill?: SalesSkillKey;
  averageProgress?: number;
  totalSessions: number;
};

type MyTeamRow = {
  teamId: string;
  name: string;
  role: 'manager' | 'rep';
  ownerId: string;
};

type TeamAssignmentRow = {
  id: string;
  teamId: string;
  teamName: string;
  skill: SalesSkillKey;
  assignmentType: 'drill' | 'adaptive';
  targetUserId: string | null;
  createdAt: string;
};

type CoachingEvaluation = {
  conversationId?: string;
  summary: CoachingSummary;
  skillScores: CoachingSkillScore[];
  weaknessProfile?: WeaknessProfileRow[];
};

/** Mirrors server GET /conversations; validated on backend with Zod when non-null. */
type AdaptiveScenarioPlanPayload = {
  coachingFocusSummary: string;
  scenarioRationale?: string;
  targetWeaknesses?: SalesSkillKey[];
};

type DrillPlanPayload = {
  mode: 'drill';
  primarySkill: SalesSkillKey;
  secondarySkill?: SalesSkillKey;
  coachingFocusSummary: string;
  drillObjective: string;
  variantKey?: string;
};

type Conversation = {
  id: string;
  personaId: string;
  userId?: string;
  simulationMode?: 'generic' | 'adaptive' | 'drill';
  adaptiveScenarioPlan?: AdaptiveScenarioPlanPayload | null;
  drillPlan?: DrillPlanPayload | null;
  createdAt: string;
  messages: Message[];
  persona: { id: string; name: string; tone: string | null } | null;
  evaluation: Evaluation | null;
  coachingEvaluation: {
    summary: CoachingSummary;
    skillScores: CoachingSkillScore[];
  } | null;
};

// API Response types
type ApiResponse<T> = { ok: boolean } & T;
type PersonasResponse = ApiResponse<{ personas: Persona[] }>;
type ProductsResponse = ApiResponse<{ products: Product[] }>;
type ConversationsResponse = ApiResponse<{ conversations: Conversation[] }>;
type LiveCoachingTipPayload = {
  kind: SalesSkillKey;
  message: string;
  rationale?: string;
  confidence: 'low' | 'medium' | 'high';
  triggerSource: string;
};

type ChatResponse = {
  conversationId: string;
  reply: string;
  adaptiveScenario?: AdaptiveScenarioPlanPayload;
  drillPlan?: DrillPlanPayload;
  liveCoaching?: LiveCoachingTipPayload | null;
};

type TrainingFocusPayload = {
  focusSkills: SalesSkillKey[];
  sessionsRemaining: number | null;
  source: string;
  updatedAt: string;
};
type ScriptResponse = { id: string; steps: string; personaId: string | null; productId: string; tone: string | null };

// =============================================================================
// CONSTANTS
// =============================================================================

const CORE_TABS = ['Roleplay', 'Script Generator', 'Feedback'] as const;
type CoreTab = typeof CORE_TABS[number];
type Tab = CoreTab | 'Team';

const TONES = ['neutral', 'friendly', 'professional', 'enthusiastic', 'empathetic'] as const;

const SKILL_LABELS: Record<SalesSkillKey, string> = {
  discovery_questions: 'Discovery',
  objection_handling: 'Objections',
  product_knowledge: 'Product knowledge',
  closing: 'Closing',
  storytelling: 'Storytelling',
  empathy: 'Empathy',
};

const MODE_LABELS: Record<'generic' | 'adaptive' | 'drill', string> = {
  generic: 'Normal',
  adaptive: 'Adaptive',
  drill: 'Drill',
};

const LIVE_COACH_STORAGE_KEY = 'threadnotion_liveCoachTips';

function trainingImprovementArrow(rate: number): 'improving' | 'declining' | 'stable' {
  if (rate > 0.05) return 'improving';
  if (rate < -0.05) return 'declining';
  return 'stable';
}

function SkillSparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) {
    return <span className="text-zinc-600 text-xs tabular-nums">—</span>;
  }
  const w = 72;
  const h = 22;
  const pad = 2;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  const pts = scores
    .map((s, i) => {
      const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
      const y = pad + (h - pad * 2) * (1 - (s - min) / span);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      width={w}
      height={h}
      className="text-sky-400/85 shrink-0"
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function trendArrow(dir: 'improving' | 'declining' | 'stable'): string {
  if (dir === 'improving') return '↑';
  if (dir === 'declining') return '↓';
  return '→';
}

function formatSimDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}`;
}

function orchestratedTrainingHeadline(orch: OrchestratedRecommendationPayload): string {
  if (orch.recommendedMode === 'generic') return 'Balanced simulation';
  const first = orch.targetSkills[0];
  if (!first) {
    return orch.recommendedMode === 'adaptive' ? 'Adaptive simulation' : 'Focused drill';
  }
  const label = SKILL_LABELS[first];
  if (orch.recommendedMode === 'drill') return `${label} drill`;
  return `${label} adaptive scenario`;
}

function TrainingInsightsSection({
  analytics,
  trainingRecommendation,
}: {
  analytics: TrainingAnalyticsPayload;
  trainingRecommendation: TrainingRecommendationPayload | null;
}) {
  const primary = trainingRecommendation?.primarySkill;
  const persist = analytics.persistentWeakness;
  const weakest = analytics.weakestSkill;
  const mostImproved = analytics.mostImprovedSkill;

  const recommendationMatchesWeakness =
    primary != null &&
    (primary === persist || primary === weakest);

  const showPositiveReinforcement =
    mostImproved != null && mostImproved !== persist;

  return (
    <div className="rounded-lg bg-zinc-950/50 border border-zinc-700/70 p-4 space-y-3">
      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Training insights</h4>
      {analytics.sessionsAnalyzed === 0 ? (
        <p className="text-sm text-zinc-500 leading-relaxed">
          Complete and grade simulations to see skill trends and mode breakdowns from your runs.
        </p>
      ) : (
        <>
          <ul className="text-sm text-zinc-300 space-y-1">
            {analytics.strongestSkill ? (
              <li>
                <span className="text-zinc-500">Strongest: </span>
                {SKILL_LABELS[analytics.strongestSkill]}
              </li>
            ) : null}
            {mostImproved ? (
              <li>
                <span className="text-zinc-500">Most improved: </span>
                {SKILL_LABELS[mostImproved]}
              </li>
            ) : null}
            {persist ? (
              <li>
                <span className="text-zinc-500">Often in bottom tier: </span>
                {SKILL_LABELS[persist]}
              </li>
            ) : null}
          </ul>
          {recommendationMatchesWeakness && primary ? (
            <p className="text-xs text-amber-400/90 leading-snug">
              Matches your most recurring struggle in recent graded runs ({SKILL_LABELS[primary]}).
            </p>
          ) : null}
          {showPositiveReinforcement && mostImproved ? (
            <p className="text-xs text-emerald-400/90 leading-snug">
              Nice momentum on {SKILL_LABELS[mostImproved]}—keep building on that lift.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-700/80">
                  <th className="py-1.5 pr-2 font-medium">Skill</th>
                  <th className="py-1.5 pr-2 font-medium tabular-nums">Avg</th>
                  <th className="py-1.5 pr-2 font-medium tabular-nums">Recent</th>
                  <th className="py-1.5 pr-2 font-medium">Δ</th>
                  <th className="py-1.5 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {analytics.skills.map((row) => (
                  <tr key={row.skill} className="border-b border-zinc-800/80 text-zinc-300">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{SKILL_LABELS[row.skill]}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{row.averageScore.toFixed(1)}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{row.recentAverageScore.toFixed(1)}</td>
                    <td className="py-1.5 pr-2 text-zinc-500" title="Early-window vs recent-window gap">
                      <span className="text-zinc-600">{trendArrow(trainingImprovementArrow(row.improvementRate))}</span>{' '}
                      <span className="tabular-nums">
                        {row.improvementRate >= 0 ? '+' : ''}
                        {row.improvementRate.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-1">
                      <SkillSparkline scores={row.trendScores ?? []} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Modes (graded sessions)</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
              {analytics.modes.map((m) => (
                <li key={m.mode}>
                  <span className="text-zinc-500">{MODE_LABELS[m.mode]}: </span>
                  {m.sessionCount}
                  {m.averageScoreImprovement != null && Number.isFinite(m.averageScoreImprovement) ? (
                    <span className="text-zinc-600 ml-1 tabular-nums">
                      (next-session Δ avg {m.averageScoreImprovement >= 0 ? '+' : ''}
                      {m.averageScoreImprovement.toFixed(2)})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-zinc-600">
            Based on {analytics.sessionsAnalyzed} graded run{analytics.sessionsAnalyzed === 1 ? '' : 's'}.
          </p>
        </>
      )}
    </div>
  );
}

function ProgressSection({ snapshot }: { snapshot: ProgressSnapshot }) {
  return (
    <div className="rounded-lg bg-zinc-950/50 border border-zinc-700/70 p-4 space-y-3">
      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Progress</h4>
      <p className="text-sm text-zinc-300 leading-relaxed">{snapshot.overallProgressSummary}</p>
      {snapshot.recommendedFocusMessage ? (
        <p className="text-sm text-zinc-200">
          <span className="text-zinc-500">Next focus: </span>
          {snapshot.recommendedFocusMessage}
        </p>
      ) : null}
      <ul className="space-y-1.5 text-sm">
        {snapshot.skills.map((sp) => (
          <li key={sp.skill} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-zinc-300">
            <span className="text-zinc-500 min-w-[7rem]">{SKILL_LABELS[sp.skill]}</span>
            <span className="tabular-nums">{sp.currentScore.toFixed(1)}</span>
            <span className="text-zinc-600" title={sp.trendDirection}>
              {trendArrow(sp.trendDirection)}
            </span>
            {sp.latestSimulationScore !== undefined && (
              <span className="text-zinc-500 text-xs">
                sim {sp.latestSimulationScore}
                {sp.latestDelta !== undefined ? (
                  <span className="text-emerald-400/90 ml-1">({formatSimDelta(sp.latestDelta)})</span>
                ) : null}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Phase 3 transcript-grounded coaching narrative (optional when API returns it). */
function CoachingNarrativeSection({ summary }: { summary: CoachingSummary }) {
  const cf = summary.coachingFeedback;
  if (!cf) return null;
  return (
    <div className="space-y-5 border-b border-zinc-700/80 pb-6">
      <div className="rounded-lg bg-zinc-950/60 border border-zinc-700/80 p-4">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Coach summary</h4>
        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{cf.overallCoachingSummary}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium text-emerald-400/90 mb-2">What went well</h4>
          <ul className="space-y-2 text-sm text-zinc-300">
            {cf.strengths.map((s, i) => (
              <li key={i}>
                <span className="text-zinc-500 text-xs">{SKILL_LABELS[s.skill]}: </span>
                {s.explanation}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-amber-400/90 mb-2">Areas to improve</h4>
          <ul className="space-y-2 text-sm text-zinc-300">
            {cf.improvementAreas.map((s, i) => (
              <li key={i}>
                <span className="text-zinc-500 text-xs">{SKILL_LABELS[s.skill]}: </span>
                {s.explanation}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-sky-400/90 mb-3">Key moments</h4>
        <div className="space-y-3">
          {cf.keyMoments.map((m, i) => (
            <div key={i} className="rounded-lg border border-zinc-700/80 bg-zinc-950/40 p-3 text-sm">
              <div className="text-xs text-zinc-500 mb-1">{SKILL_LABELS[m.skill]}</div>
              {(m.userMessage || m.customerMessage) && (
                <p className="text-zinc-500 text-xs italic mb-2">
                  {m.userMessage && (
                    <span>
                      You: &ldquo;{m.userMessage.slice(0, 220)}
                      {m.userMessage.length > 220 ? '…' : ''}&rdquo;
                    </span>
                  )}
                  {m.userMessage && m.customerMessage && ' · '}
                  {m.customerMessage && (
                    <span>
                      Customer: &ldquo;{m.customerMessage.slice(0, 220)}
                      {m.customerMessage.length > 220 ? '…' : ''}&rdquo;
                    </span>
                  )}
                </p>
              )}
              <p className="text-zinc-300 mb-1">
                <span className="text-zinc-500">Why it matters: </span>
                {m.whyItMatters}
              </p>
              <p className="text-zinc-400">
                <span className="text-zinc-500">Try next: </span>
                {m.suggestedApproach}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-violet-400/90 mb-2">Next time focus</h4>
        <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
          {cf.nextTimeFocus.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Colors
const NAVY_ACCENT = '#1e3a5f';
const NAVY_LIGHT = '#2d4a6f';
const NAVY_DARK = '#152a45';

// =============================================================================
// USER ID MANAGEMENT (NEW)
// =============================================================================
// These functions handle anonymous user identification.
// We generate a UUID and store it in localStorage so it persists across sessions.

const USER_ID_STORAGE_KEY = 'threadnotion_user_id';

/**
 * Generate a UUID v4
 * This creates a unique identifier for the user.
 */
function generateUserId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a user ID from localStorage
 * - If user already has an ID, return it
 * - If not, generate a new one and save it
 */
function getUserId(): string {
  // Only run in browser (not during SSR)
  if (typeof window === 'undefined') {
    return '';
  }

  // Try to get existing ID
  let userId = localStorage.getItem(USER_ID_STORAGE_KEY);

  // If no ID exists, generate and save one
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
    console.log('Generated new user ID:', userId);
  }

  return userId;
}

// =============================================================================
// LOADING & ERROR COMPONENTS
// =============================================================================

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <svg className={`animate-spin ${sizeClasses[size]}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center z-10 rounded-xl">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-2 text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 mb-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-red-300">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BackendOffline({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Backend Unavailable</h1>
        <p className="text-zinc-400 mb-6">
          Unable to connect to the ThreadNotion API. Make sure the backend server is running on port 3001.
        </p>
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full px-4 py-3 rounded-lg text-white font-medium transition-all"
            style={{ backgroundColor: NAVY_ACCENT }}
          >
            Retry Connection
          </button>
          <div className="text-xs text-zinc-500">
            <p>To start the backend:</p>
            <code className="block mt-1 p-2 bg-zinc-900 rounded">npm run start</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

function TabButton({ tab, activeTab, onClick }: { tab: Tab; activeTab: Tab; onClick: () => void }) {
  const isActive = tab === activeTab;
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
        isActive
          ? 'text-white border-b-2'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
      style={isActive ? { backgroundColor: NAVY_ACCENT, borderBottomColor: '#60a5fa' } : {}}
    >
      {tab}
    </button>
  );
}

function Score({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const percentage = (value / max) * 100;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: NAVY_ACCENT }}
        />
      </div>
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' }) {
  const colors = {
    default: 'bg-zinc-700 text-zinc-300',
    success: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700',
    warning: 'bg-amber-900/50 text-amber-400 border border-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${colors[variant]}`}>
      {children}
    </span>
  );
}

function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const date = new Date(conversation.createdAt);
  const timeStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const isGraded = !!conversation.evaluation || !!conversation.coachingEvaluation;
  const messageCount = conversation.messages?.length || 0;
  const coachBadge =
    conversation.coachingEvaluation?.skillScores?.length &&
    conversation.coachingEvaluation.skillScores.length > 0
      ? Math.round(
          conversation.coachingEvaluation.skillScores.reduce((acc, s) => acc + s.score, 0) /
            conversation.coachingEvaluation.skillScores.length
        )
      : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-500 bg-zinc-800'
          : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-400">{timeStr}</span>
        {isGraded ? (
          <Badge variant="success">
            ✓{' '}
            {coachBadge != null
              ? `avg ${coachBadge}`
              : conversation.evaluation?.total != null
                ? conversation.evaluation.total
                : '—'}
          </Badge>
        ) : (
          <Badge variant="warning">⏳</Badge>
        )}
      </div>
      <div className="text-sm text-white truncate">
        {conversation.persona?.name || 'Unknown Persona'}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="text-xs text-zinc-500">{messageCount} messages</span>
        <span
          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
            conversation.simulationMode === 'drill'
              ? 'bg-amber-900/50 text-amber-300'
              : conversation.simulationMode === 'adaptive'
                ? 'bg-blue-900/40 text-blue-300'
                : 'bg-zinc-800 text-zinc-500'
          }`}
          title={
            conversation.simulationMode === 'drill'
              ? 'Focused drill'
              : conversation.simulationMode === 'adaptive'
                ? 'Adaptive (profile weaknesses)'
                : 'Generic'
          }
        >
          {conversation.simulationMode === 'drill'
            ? 'Drill'
            : conversation.simulationMode === 'adaptive'
              ? 'Adaptive'
              : 'Normal'}
        </span>
      </div>
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 text-xs rounded-lg border border-zinc-600 hover:bg-zinc-700 transition-all flex items-center gap-1"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-600 hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg text-white transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: NAVY_ACCENT }}
          >
            {loading && <Spinner size="sm" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function HomePage() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState<Tab>('Roleplay');

  // NEW: User identification (persisted in localStorage)
  const [userId, setUserId] = useState<string>('');
  const { data: session, status: sessionStatus } = useSession();

  // Connection state
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Data
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Loading states
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);

  // Roleplay tab
  const [personaId, setPersonaId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>('');
  const [chatMode, setChatMode] = useState<'roleplay' | 'assistant'>('roleplay');
  const [liveCoachTipsEnabled, setLiveCoachTipsEnabled] = useState(false);
  const [liveCoachTip, setLiveCoachTip] = useState<LiveCoachingTipPayload | null>(null);
  const [liveCoachTipDismissed, setLiveCoachTipDismissed] = useState(false);
  const [simulationMode, setSimulationMode] = useState<'generic' | 'adaptive' | 'drill'>('generic');
  const [drillPrimarySkill, setDrillPrimarySkill] = useState<SalesSkillKey>('discovery_questions');
  const [drillSecondarySkill, setDrillSecondarySkill] = useState<SalesSkillKey | ''>('');
  const [draft, setDraft] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  /** First-reply echo from POST /chat when adaptive plan was created (before list refresh). */
  const [adaptivePlanFromChat, setAdaptivePlanFromChat] = useState<AdaptiveScenarioPlanPayload | null>(
    null
  );
  const [drillPlanFromChat, setDrillPlanFromChat] = useState<DrillPlanPayload | null>(null);
  const [trainingFocus, setTrainingFocus] = useState<TrainingFocusPayload | null>(null);
  const [trainingRecommendation, setTrainingRecommendation] = useState<TrainingRecommendationPayload | null>(
    null
  );
  const [orchestratedRecommendation, setOrchestratedRecommendation] =
    useState<OrchestratedRecommendationPayload | null>(null);
  const [trainingAnalytics, setTrainingAnalytics] = useState<TrainingAnalyticsPayload | null>(null);

  // Feedback (in Roleplay tab)
  const [grading, setGrading] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [coachingEvaluation, setCoachingEvaluation] = useState<CoachingEvaluation | null>(null);
  const [progressSnapshot, setProgressSnapshot] = useState<ProgressSnapshot | null>(null);
  const [progressConversationId, setProgressConversationId] = useState<string | null>(null);

  // Script Generator tab
  const [scriptPersonaId, setScriptPersonaId] = useState<string>('');
  const [scriptProductId, setScriptProductId] = useState<string>('');
  const [scriptTone, setScriptTone] = useState<string>('neutral');
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [generatingScript, setGeneratingScript] = useState(false);

  // Feedback tab
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [feedbackGrading, setFeedbackGrading] = useState(false);
  const [showRegradeModal, setShowRegradeModal] = useState(false);

  // Phase 8: teams
  const [myTeams, setMyTeams] = useState<MyTeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalyticsPayload | null>(null);
  const [teamMembers, setTeamMembers] = useState<
    Array<{ userId: string; role: string; displayName: string | null }>
  >([]);
  const [memberTrainingAnalytics, setMemberTrainingAnalytics] = useState<
    Record<string, TrainingAnalyticsPayload>
  >({});
  const [teamPanelLoading, setTeamPanelLoading] = useState(false);
  const [trainingAssignments, setTrainingAssignments] = useState<TeamAssignmentRow[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberDisplayName, setAddMemberDisplayName] = useState('');
  const [assignSkill, setAssignSkill] = useState<SalesSkillKey>('objection_handling');
  const [assignType, setAssignType] = useState<'drill' | 'adaptive'>('drill');
  const [assignTargetUserId, setAssignTargetUserId] = useState('');

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const visibleTabs: Tab[] = useMemo(
    () => (myTeams.length > 0 ? [...CORE_TABS, 'Team'] : [...CORE_TABS]),
    [myTeams.length]
  );

  const selectedTeamMeta = useMemo(
    () => myTeams.find((t) => t.teamId === selectedTeamId) ?? null,
    [myTeams, selectedTeamId]
  );

  const isManagerForSelectedTeam = selectedTeamMeta?.role === 'manager';

  const canSend = personaId && draft.trim().length > 0 && !sending;
  const canGenerateScript = scriptPersonaId && scriptProductId && scriptTone && !generatingScript;

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId]
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const activeRoleplayScenario = useMemo(() => {
    const fromList = conversations.find((c) => c.id === conversationId)?.adaptiveScenarioPlan;
    if (fromList?.coachingFocusSummary) return fromList;
    if (adaptivePlanFromChat?.coachingFocusSummary) return adaptivePlanFromChat;
    return null;
  }, [conversations, conversationId, adaptivePlanFromChat]);

  const activeDrillScenario = useMemo(() => {
    const fromList = conversations.find((c) => c.id === conversationId)?.drillPlan;
    if (fromList?.coachingFocusSummary) return fromList;
    if (drillPlanFromChat?.coachingFocusSummary) return drillPlanFromChat;
    return null;
  }, [conversations, conversationId, drillPlanFromChat]);

  // ---------------------------------------------------------------------------
  // DATA FETCHING WITH ERROR HANDLING
  // ---------------------------------------------------------------------------

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${base}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      return data.ok === true;
    } catch {
      return false;
    }
  }, []);

  const fetchPersonas = useCallback(async () => {
    setLoadingPersonas(true);
    try {
      const res = await fetch('/api/personas', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`Failed to fetch personas (${res.status})`);
      const data = (await res.json()) as PersonasResponse;
      if (data?.ok && Array.isArray(data.personas)) {
        setPersonas(data.personas);
        if (data.personas.length > 0) {
          const first = data.personas[0]!.id;
          setPersonaId((prev) => prev || first);
          setScriptPersonaId((prev) => prev || first);
        }
      }
    } catch (e) {
      console.error('Failed to load personas', e);
      setError('Failed to load personas. Check backend connection.');
    } finally {
      setLoadingPersonas(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = (await res.json()) as ProductsResponse;
      if (data?.ok && Array.isArray(data.products)) {
        setProducts(data.products);
        if (data.products.length > 0) {
          const first = data.products[0]!.id;
          setProductId((prev) => prev || first);
          setScriptProductId((prev) => prev || first);
        }
      }
    } catch (e) {
      console.error('Failed to load products', e);
      // Don't show error - products are optional
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // UPDATED: Now fetches conversations filtered by userId
  const fetchConversations = useCallback(async () => {
    if (!userId) {
      console.log('No userId yet, skipping conversation fetch');
      return;
    }

    setLoadingConversations(true);
    try {
      const res = await fetch(`/api/conversations`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = (await res.json()) as ConversationsResponse;
      if (data?.ok && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        console.log(`Loaded ${data.conversations.length} conversations for user ${userId.slice(0, 8)}...`);
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
      // Don't show error - conversations list is non-critical
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);

  const fetchTrainingFocus = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/training-focus`);
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; trainingFocus: TrainingFocusPayload | null };
      if (data?.ok && data.trainingFocus) {
        setTrainingFocus(data.trainingFocus);
      } else {
        setTrainingFocus(null);
      }
    } catch {
      setTrainingFocus(null);
    }
  }, [userId]);

  const fetchUserProgress = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/user-progress`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        trainingRecommendation?: TrainingRecommendationPayload;
        orchestratedRecommendation?: OrchestratedRecommendationPayload;
      };
      if (data?.trainingRecommendation) {
        setTrainingRecommendation(data.trainingRecommendation);
      } else {
        setTrainingRecommendation(null);
      }
      if (data?.orchestratedRecommendation) {
        setOrchestratedRecommendation(data.orchestratedRecommendation);
      } else {
        setOrchestratedRecommendation(null);
      }
    } catch {
      setTrainingRecommendation(null);
      setOrchestratedRecommendation(null);
    }
  }, [userId]);

  const fetchUserTrainingAnalytics = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/user-training-analytics`);
      if (!res.ok) {
        setTrainingAnalytics(null);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; analytics?: TrainingAnalyticsPayload };
      if (data?.ok && data.analytics) {
        setTrainingAnalytics(data.analytics);
      } else {
        setTrainingAnalytics(null);
      }
    } catch {
      setTrainingAnalytics(null);
    }
  }, [userId]);

  const fetchMyTeams = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/teams`);
      if (!res.ok) {
        setMyTeams([]);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; teams?: MyTeamRow[] };
      setMyTeams(data.teams ?? []);
    } catch {
      setMyTeams([]);
    }
  }, [userId]);

  const fetchTrainingAssignments = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/training-assignments`);
      if (!res.ok) {
        setTrainingAssignments([]);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; assignments?: TeamAssignmentRow[] };
      setTrainingAssignments(
        (data.assignments ?? []).map((a) => ({
          ...a,
          targetUserId: a.targetUserId ?? null,
        }))
      );
    } catch {
      setTrainingAssignments([]);
    }
  }, [userId]);

  const loadTeamPanelData = useCallback(async () => {
    if (!userId || !selectedTeamId) return;
    setTeamPanelLoading(true);
    setTeamAnalytics(null);
    setTeamMembers([]);
    setMemberTrainingAnalytics({});
    try {
      const aRes = await fetch(
        `/api/team/${encodeURIComponent(selectedTeamId)}/analytics`
      );
      const aData = (await aRes.json()) as { ok?: boolean; teamAnalytics?: TeamAnalyticsPayload };
      if (aRes.ok && aData.teamAnalytics) {
        setTeamAnalytics(aData.teamAnalytics);
      }
      const meta = myTeams.find((t) => t.teamId === selectedTeamId);
      if (meta?.role === 'manager') {
        const mRes = await fetch(
          `/api/team/${encodeURIComponent(selectedTeamId)}/members`
        );
        const mData = (await mRes.json()) as {
          ok?: boolean;
          members?: Array<{ userId: string; role: string; displayName: string | null }>;
        };
        if (mRes.ok && mData.members) {
          setTeamMembers(mData.members);
          const entries = await Promise.all(
            mData.members.map(async (mem) => {
              const uRes = await fetch(
                `/api/team/${encodeURIComponent(selectedTeamId)}/member-progress?memberUserId=${encodeURIComponent(
                  mem.userId
                )}`
              );
              const uData = (await uRes.json()) as { ok?: boolean; analytics?: TrainingAnalyticsPayload };
              return [mem.userId, uData.analytics] as const;
            })
          );
          const map: Record<string, TrainingAnalyticsPayload> = {};
          for (const [uid, an] of entries) {
            if (an) map[uid] = an;
          }
          setMemberTrainingAnalytics(map);
        }
      }
    } catch (e) {
      console.error('Team panel load failed', e);
    } finally {
      setTeamPanelLoading(false);
    }
  }, [userId, selectedTeamId, myTeams]);

  const initializeApp = useCallback(async () => {
    setInitialLoading(true);
    setError(null);

    const isConnected = await checkBackendHealth();
    setBackendConnected(isConnected);

    if (isConnected) {
      await Promise.all([fetchPersonas(), fetchProducts()]);
    }

    setInitialLoading(false);
  }, [checkBackendHealth, fetchPersonas, fetchProducts]);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStatus !== 'authenticated') return;
    const authUserId = session?.user?.id;
    if (!authUserId) return;

    const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
    // Keep a reference to the pre-auth anonymous id to claim its history.
    if (existing && existing !== authUserId) {
      void fetch('/api/auth/link-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousUserId: existing }),
      }).catch((e) => {
        console.error('Anonymous history linking failed', e);
      });
    }

    window.localStorage.setItem(USER_ID_STORAGE_KEY, authUserId);
    setUserId(authUserId);
  }, [sessionStatus, session?.user?.id]);

  // NEW: Fetch conversations when userId becomes available
  useEffect(() => {
    if (userId && backendConnected) {
      fetchConversations();
      fetchTrainingFocus();
      fetchUserProgress();
      fetchUserTrainingAnalytics();
      fetchMyTeams();
      fetchTrainingAssignments();
    }
  }, [
    userId,
    backendConnected,
    fetchConversations,
    fetchTrainingFocus,
    fetchUserProgress,
    fetchUserTrainingAnalytics,
    fetchMyTeams,
    fetchTrainingAssignments,
  ]);

  useEffect(() => {
    if (myTeams.length === 0) {
      setSelectedTeamId('');
      return;
    }
    setSelectedTeamId((prev) => {
      if (prev && myTeams.some((t) => t.teamId === prev)) return prev;
      return myTeams[0]!.teamId;
    });
  }, [myTeams]);

  useEffect(() => {
    if (activeTab === 'Team' && myTeams.length === 0) {
      setActiveTab('Roleplay');
    }
  }, [activeTab, myTeams.length]);

  useEffect(() => {
    if (activeTab !== 'Team' || !selectedTeamId || !userId) return;
    void loadTeamPanelData();
  }, [activeTab, selectedTeamId, userId, loadTeamPanelData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = window.localStorage.getItem(LIVE_COACH_STORAGE_KEY);
      setLiveCoachTipsEnabled(v === '1' || v === 'true');
    } catch {
      setLiveCoachTipsEnabled(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function persistLiveCoachToggle(on: boolean) {
    setLiveCoachTipsEnabled(on);
    try {
      window.localStorage.setItem(LIVE_COACH_STORAGE_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------------------
  // ROLEPLAY HANDLERS
  // ---------------------------------------------------------------------------

  function startNewConversation() {
    setConversationId('');
    setMessages([]);
    setEvaluation(null);
    setCoachingEvaluation(null);
    setProgressSnapshot(null);
    setProgressConversationId(null);
    setAdaptivePlanFromChat(null);
    setDrillPlanFromChat(null);
    setLiveCoachTip(null);
    setLiveCoachTipDismissed(false);
    stopRecording();
    window.speechSynthesis?.cancel();
    setSpeakingIdx(null);
  }

  function startRecording() {
    const API = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!API) return;
    const recognition = new API();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      setDraft(e.results[0]?.[0]?.transcript ?? '');
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => { setIsRecording(false); recognitionRef.current = null; };
    recognition.onend = () => { setIsRecording(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }

  function toggleSpeak(idx: number, content: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  }

  function trainWeaknesses() {
    setSimulationMode('adaptive');
    startNewConversation();
  }

  function startNormalSimulation() {
    setSimulationMode('generic');
    startNewConversation();
  }

  function startDrillForSkill(skill: SalesSkillKey, secondary?: SalesSkillKey) {
    setSimulationMode('drill');
    setDrillPrimarySkill(skill);
    setDrillSecondarySkill(secondary && secondary !== skill ? secondary : '');
    startNewConversation();
  }

  function launchRecommendedNextStep() {
    const orch = orchestratedRecommendation;
    if (orch && orch.targetSkills.length > 0) {
      if (orch.recommendedMode === 'drill') {
        startDrillForSkill(orch.targetSkills[0]!, orch.targetSkills[1]);
      } else if (orch.recommendedMode === 'adaptive') {
        trainWeaknesses();
      } else {
        startNormalSimulation();
      }
      setActiveTab('Roleplay');
      return;
    }
    if (!trainingRecommendation) return;
    const { recommendedMode, primarySkill, secondarySkill } = trainingRecommendation;
    if (recommendedMode === 'drill' && primarySkill) {
      startDrillForSkill(primarySkill, secondarySkill);
    } else if (recommendedMode === 'adaptive') {
      trainWeaknesses();
    } else {
      startNormalSimulation();
    }
    setActiveTab('Roleplay');
  }

  async function pinTrainingFocusFromProgress(skills: SalesSkillKey[], sessions: number) {
    if (!userId) return;
    try {
      const res = await fetch(`/api/training-focus`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focusSkills: skills.slice(0, 3),
          sessionsRemaining: sessions,
          source: 'progress',
        }),
      });
      if (!res.ok) return;
      await fetchTrainingFocus();
    } catch (e) {
      console.error('Failed to save training focus', e);
    }
  }

  async function clearTrainingFocusState() {
    if (!userId) return;
    try {
      const res = await fetch(`/api/training-focus`, {
        method: 'DELETE',
      });
      if (!res.ok) return;
      setTrainingFocus(null);
    } catch (e) {
      console.error('Failed to clear training focus', e);
    }
  }

  async function handleCreateTeam() {
    if (!userId || !newTeamName.trim()) return;
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      if (!res.ok) return;
      setNewTeamName('');
      await fetchMyTeams();
    } catch (e) {
      console.error('Create team failed', e);
    }
  }

  async function handleAddTeamMember() {
    if (!userId || !selectedTeamId || !addMemberId.trim()) return;
    try {
      const res = await fetch(
        `/api/team/${encodeURIComponent(selectedTeamId)}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberUserId: addMemberId.trim(),
            ...(addMemberDisplayName.trim() ? { displayName: addMemberDisplayName.trim() } : {}),
          }),
        }
      );
      if (!res.ok) return;
      setAddMemberId('');
      setAddMemberDisplayName('');
      await loadTeamPanelData();
    } catch (e) {
      console.error('Add member failed', e);
    }
  }

  async function handleCreateAssignment() {
    if (!userId || !selectedTeamId) return;
    try {
      const body: Record<string, unknown> = {
        skill: assignSkill,
        assignmentType: assignType,
      };
      if (assignTargetUserId.trim()) {
        body.targetUserId = assignTargetUserId.trim();
      }
      const res = await fetch(`/api/team/${encodeURIComponent(selectedTeamId)}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      setAssignTargetUserId('');
      await fetchTrainingAssignments();
    } catch (e) {
      console.error('Create assignment failed', e);
    }
  }

  function startFromAssignment(a: TeamAssignmentRow) {
    if (a.assignmentType === 'drill') {
      startDrillForSkill(a.skill);
    } else {
      setSimulationMode('adaptive');
      startNewConversation();
    }
    setActiveTab('Roleplay');
  }

  function repDisplayLabel(userIdKey: string) {
    const m = teamMembers.find((x) => x.userId === userIdKey);
    if (m?.displayName) return m.displayName;
    return `${userIdKey.slice(0, 8)}…`;
  }

  function maxImprovementAcrossSkills(an: TrainingAnalyticsPayload | undefined): number {
    if (!an?.skills?.length) return 0;
    return an.skills.reduce((m, s) => Math.max(m, s.improvementRate), 0);
  }

  function loadConversation(conv: Conversation) {
    setConversationId(conv.id);
    setPersonaId(conv.personaId);
    setMessages(conv.messages.map((m) => ({ role: m.role, content: m.content })));
    setEvaluation(conv.evaluation || null);
    setAdaptivePlanFromChat(null);
    setProgressSnapshot(null);
    setProgressConversationId(null);
    setLiveCoachTip(null);
    setLiveCoachTipDismissed(false);
    stopRecording();
    window.speechSynthesis?.cancel();
    setSpeakingIdx(null);
    if (conv.coachingEvaluation) {
      setCoachingEvaluation({
        conversationId: conv.id,
        summary: conv.coachingEvaluation.summary,
        skillScores: conv.coachingEvaluation.skillScores,
        weaknessProfile: [],
      });
    } else {
      setCoachingEvaluation(null);
    }
    if (conv.simulationMode) setSimulationMode(conv.simulationMode);
    if (conv.simulationMode === 'drill' && conv.drillPlan?.primarySkill) {
      setDrillPrimarySkill(conv.drillPlan.primarySkill);
      setDrillSecondarySkill(conv.drillPlan.secondarySkill ?? '');
    }
  }

  // UPDATED: Now includes userId when sending messages
  async function sendMessage() {
    if (!canSend) return;

    const userMsg = draft.trim();
    setDraft('');
    setEvaluation(null);
    setCoachingEvaluation(null);
    setProgressSnapshot(null);
    setProgressConversationId(null);
    setLiveCoachTipDismissed(false);

    // Optimistic update
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      const payload: Record<string, unknown> = {
        personaId,
        productId: productId || undefined,
        message: userMsg,
        mode: chatMode,
        simulationMode,
      };
      if (conversationId) payload.conversationId = conversationId;
      if (simulationMode === 'drill' && chatMode === 'roleplay') {
        payload.primaryDrillSkill = drillPrimarySkill;
        if (drillSecondarySkill && drillSecondarySkill !== drillPrimarySkill) {
          payload.secondaryDrillSkill = drillSecondarySkill;
        }
      }
      if (chatMode === 'roleplay' && liveCoachTipsEnabled) {
        payload.liveCoachingEnabled = true;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Chat request failed');

      const data = (await res.json()) as ChatResponse;

      if (data?.conversationId) setConversationId(data.conversationId);
      if (data.adaptiveScenario?.coachingFocusSummary) {
        setAdaptivePlanFromChat(data.adaptiveScenario);
      }
      if (data.drillPlan?.coachingFocusSummary) {
        setDrillPlanFromChat(data.drillPlan);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply ?? '(no reply)' }]);
      if (chatMode === 'roleplay' && liveCoachTipsEnabled && data.liveCoaching) {
        setLiveCoachTip(data.liveCoaching);
        setLiveCoachTipDismissed(false);
      } else if (chatMode === 'roleplay' && liveCoachTipsEnabled) {
        setLiveCoachTip(null);
      }

      // Refresh conversations list in background
      fetchConversations();
    } catch (e) {
      console.error('Failed to send message', e);
      // Remove optimistic message and show error
      setMessages((prev) => prev.slice(0, -1));
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function gradeConversation(convId?: string) {
    const idToGrade = convId || conversationId;
    if (!idToGrade) return;

    setGrading(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: idToGrade }),
      });

      if (!res.ok) throw new Error('Grading request failed');

      const data = (await res.json()) as {
        ok?: boolean;
        coachingEvaluation?: CoachingEvaluation;
        progressSnapshot?: ProgressSnapshot;
        trainingRecommendation?: TrainingRecommendationPayload;
        orchestratedRecommendation?: OrchestratedRecommendationPayload;
      };
      if (data.coachingEvaluation) {
        setCoachingEvaluation({
          ...data.coachingEvaluation,
          conversationId: data.coachingEvaluation.conversationId ?? idToGrade,
        });
        setEvaluation(null);
      }
      if (data.progressSnapshot && idToGrade) {
        setProgressSnapshot(data.progressSnapshot);
        setProgressConversationId(idToGrade);
      } else {
        setProgressSnapshot(null);
        setProgressConversationId(null);
      }
      if (data.trainingRecommendation) {
        setTrainingRecommendation(data.trainingRecommendation);
      }
      if (data.orchestratedRecommendation) {
        setOrchestratedRecommendation(data.orchestratedRecommendation);
      }
      fetchConversations();
      fetchTrainingFocus();
      fetchUserTrainingAnalytics();
    } catch (e) {
      console.error('Failed to grade conversation', e);
      setError('Failed to grade conversation. Please try again.');
    } finally {
      setGrading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // SCRIPT GENERATOR HANDLERS
  // ---------------------------------------------------------------------------

  async function generateScript() {
    if (!canGenerateScript) return;

    setGeneratingScript(true);
    setGeneratedScript('');
    setError(null);

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: scriptPersonaId,
          productId: scriptProductId,
          tone: scriptTone,
        }),
      });

      if (!res.ok) throw new Error('Script generation failed');

      const data = (await res.json()) as ScriptResponse;
      
      // FIXED: Handle different response shapes
      let scriptText = '';
      if (typeof data.steps === 'string') {
        scriptText = data.steps;
      } else if (data.steps && typeof data.steps === 'object') {
        // Handle if steps is an object/array
        if (Array.isArray(data.steps)) {
          scriptText = (data.steps as string[]).join('\n\n');
        } else {
          scriptText = JSON.stringify(data.steps, null, 2);
        }
      } else if ((data as any).script) {
        // Fallback for old format
        const script = (data as any).script;
        scriptText = Array.isArray(script) ? script.join('\n\n') : String(script);
      }
      
      setGeneratedScript(scriptText || 'Script generated but no content returned.');
    } catch (e) {
      console.error('Failed to generate script', e);
      setError('Failed to generate script. Please try again.');
      setGeneratedScript('');
    } finally {
      setGeneratingScript(false);
    }
  }

  // ---------------------------------------------------------------------------
  // FEEDBACK TAB HANDLERS
  // ---------------------------------------------------------------------------

  async function gradeFeedbackConversation() {
    if (!selectedConversationId) return;

    setFeedbackGrading(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId }),
      });

      if (!res.ok) throw new Error('Grading request failed');

      const data = (await res.json()) as {
        progressSnapshot?: ProgressSnapshot;
        trainingRecommendation?: TrainingRecommendationPayload;
        orchestratedRecommendation?: OrchestratedRecommendationPayload;
      };
      if (data.progressSnapshot && selectedConversationId) {
        setProgressSnapshot(data.progressSnapshot);
        setProgressConversationId(selectedConversationId);
      } else {
        setProgressSnapshot(null);
        setProgressConversationId(null);
      }
      if (data.trainingRecommendation) {
        setTrainingRecommendation(data.trainingRecommendation);
      }
      if (data.orchestratedRecommendation) {
        setOrchestratedRecommendation(data.orchestratedRecommendation);
      }
      fetchConversations();
      fetchTrainingFocus();
      fetchUserTrainingAnalytics();
    } catch (e) {
      console.error('Failed to grade conversation', e);
      setError('Failed to grade conversation. Please try again.');
    } finally {
      setFeedbackGrading(false);
      setShowRegradeModal(false);
    }
  }

  function handleRegradeClick() {
    if (selectedConversation?.evaluation || selectedConversation?.coachingEvaluation) {
      setShowRegradeModal(true);
    } else {
      gradeFeedbackConversation();
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER: Connection Check
  // ---------------------------------------------------------------------------

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-zinc-400">Connecting to ThreadNotion...</p>
        </div>
      </div>
    );
  }

  if (backendConnected === false) {
    return <BackendOffline onRetry={initializeApp} />;
  }

  // ---------------------------------------------------------------------------
  // RENDER: Main App
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800" style={{ backgroundColor: NAVY_DARK }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">ThreadNotion</h1>
              <p className="text-sm text-zinc-400 mt-1">Fashion & apparel sales training</p>
            </div>
            <div className="flex items-center gap-4">
              {session?.user?.email ? (
                <div className="text-right">
                  <p className="text-xs text-zinc-300">{session.user.email}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
                    {session.user.role === 'MANAGER' ? 'Manager' : 'Sales rep'}
                  </p>
                </div>
              ) : null}
              <Link
                href="/settings/billing"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-zinc-700 hover:bg-zinc-800"
              >
                Settings
              </Link>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-zinc-700 hover:bg-zinc-800"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {visibleTabs.map((tab) => (
              <TabButton key={tab} tab={tab} activeTab={activeTab} onClick={() => setActiveTab(tab)} />
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ================================================================= */}
        {/* ROLEPLAY TAB */}
        {/* ================================================================= */}
        {activeTab === 'Roleplay' && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Sidebar - Conversation History */}
            <aside className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">History</h2>
                <button
                  onClick={startNewConversation}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all text-white"
                  style={{ backgroundColor: NAVY_ACCENT }}
                >
                  + New
                </button>
              </div>

              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 relative">
                {loadingConversations && conversations.length === 0 && (
                  <div className="text-center py-4">
                    <Spinner size="sm" />
                  </div>
                )}
                {!loadingConversations && conversations.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No conversations yet</p>
                ) : (
                  conversations.map((conv) => (
                    <ConversationListItem
                      key={conv.id}
                      conversation={conv}
                      isSelected={conv.id === conversationId}
                      onClick={() => loadConversation(conv)}
                    />
                  ))
                )}
              </div>
            </aside>

            {/* Main Chat Area */}
            <div className="space-y-4">
              {/* Setup Row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs text-zinc-400 mb-1 block">Customer Persona</span>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    value={personaId}
                    onChange={(e) => {
                      setPersonaId(e.target.value);
                      startNewConversation();
                    }}
                    disabled={loadingPersonas}
                  >
                    {loadingPersonas && <option>Loading...</option>}
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-zinc-400 mb-1 block">Product (optional)</span>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    disabled={loadingProducts}
                  >
                    <option value="">None</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.price ? `($${p.price})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-zinc-400 mb-1 block">Mode</span>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={chatMode}
                    onChange={(e) => setChatMode(e.target.value as 'roleplay' | 'assistant')}
                  >
                    <option value="roleplay">Roleplay (AI = customer)</option>
                    <option value="assistant">Assistant (AI = helper)</option>
                  </select>
                </label>

                {chatMode === 'roleplay' && (
                  <label className="block sm:col-span-2">
                    <span className="text-xs text-zinc-400 mb-1 block">Simulation</span>
                    <select
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={simulationMode}
                      onChange={(e) =>
                        setSimulationMode(e.target.value as 'generic' | 'adaptive' | 'drill')
                      }
                      disabled={!!conversationId}
                      title={
                        conversationId
                          ? 'Simulation mode is set for this conversation'
                          : 'Generic: standard scenario. Adaptive: targets profile weaknesses. Drill: short focused practice on chosen skills.'
                      }
                    >
                      <option value="generic">Normal (generic)</option>
                      <option value="adaptive">Train my weaknesses (adaptive)</option>
                      <option value="drill">Focused drill</option>
                    </select>
                    {simulationMode === 'generic' && !conversationId && chatMode === 'roleplay' && (
                      <p className="text-xs text-zinc-500 mt-1.5 leading-snug">
                        Open-ended retail chat—no special customer pressures from your coaching profile.
                      </p>
                    )}
                    {simulationMode === 'adaptive' && !conversationId && chatMode === 'roleplay' && (
                      <p className="text-xs text-zinc-500 mt-1.5 leading-snug">
                        Customer behavior targets your tracked weaknesses from past grades (when your profile has data).
                      </p>
                    )}
                    {simulationMode === 'drill' && !conversationId && chatMode === 'roleplay' && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs text-zinc-500">Primary skill</span>
                          <select
                            className="mt-0.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                            value={drillPrimarySkill}
                            onChange={(e) => setDrillPrimarySkill(e.target.value as SalesSkillKey)}
                          >
                            {(Object.keys(SKILL_LABELS) as SalesSkillKey[]).map((k) => (
                              <option key={k} value={k}>
                                {SKILL_LABELS[k]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs text-zinc-500">Supporting skill (optional)</span>
                          <select
                            className="mt-0.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                            value={drillSecondarySkill}
                            onChange={(e) =>
                              setDrillSecondarySkill(
                                e.target.value === '' ? '' : (e.target.value as SalesSkillKey)
                              )
                            }
                          >
                            <option value="">None</option>
                            {(Object.keys(SKILL_LABELS) as SalesSkillKey[]).map((k) => (
                              <option key={k} value={k}>
                                {SKILL_LABELS[k]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="text-xs text-zinc-500 sm:col-span-2 leading-snug">
                          Short, skill-specific customer behavior—scenario style rotates so drills don&apos;t feel
                          identical.
                        </p>
                      </div>
                    )}
                  </label>
                )}

                {chatMode === 'roleplay' && (
                  <label className="flex items-center gap-2 sm:col-span-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500/40"
                      checked={liveCoachTipsEnabled}
                      onChange={(e) => persistLiveCoachToggle(e.target.checked)}
                    />
                    <span className="text-xs text-zinc-400">
                      Live coach tips
                      <span className="text-zinc-600 ml-1">(subtle hints after each reply; off by default)</span>
                    </span>
                  </label>
                )}
              </div>

              {chatMode === 'roleplay' && !conversationId && (
                <p className="text-xs text-zinc-600 leading-snug">
                  <span className="font-medium text-zinc-500">Normal</span>: open practice.{' '}
                  <span className="font-medium text-zinc-500">Adaptive</span>: pressures follow your weakness profile.{' '}
                  <span className="font-medium text-zinc-500">Drill</span>: short, skill-targeted scene (you pick skills).
                </p>
              )}

              {userId && trainingFocus && chatMode === 'roleplay' && (
                <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100/90 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="text-amber-600/90 text-xs uppercase tracking-wide mr-2">Training focus</span>
                    {trainingFocus.focusSkills.map((s) => SKILL_LABELS[s]).join(', ')}
                    {trainingFocus.sessionsRemaining != null && (
                      <span className="text-zinc-500 text-xs ml-2">
                        · {trainingFocus.sessionsRemaining} graded run(s) left on counter
                      </span>
                    )}
                    {trainingRecommendation?.primarySkill &&
                    trainingFocus.focusSkills[0] === trainingRecommendation.primarySkill ? (
                      <span className="text-zinc-500 text-xs ml-2 block sm:inline">
                        · Aligned with recommended next step
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                    onClick={() => clearTrainingFocusState()}
                  >
                    Clear
                  </button>
                </div>
              )}

              {userId &&
                (orchestratedRecommendation || trainingRecommendation) &&
                chatMode === 'roleplay' && (
                  <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/80 px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                          Next recommended training
                        </p>
                        <p className="text-sm font-medium text-zinc-100 mt-1">
                          {orchestratedRecommendation
                            ? orchestratedTrainingHeadline(orchestratedRecommendation)
                            : trainingRecommendation?.primarySkill
                              ? `${SKILL_LABELS[trainingRecommendation.primarySkill]} · ${trainingRecommendation.recommendedMode}`
                              : trainingRecommendation?.recommendedMode === 'generic'
                                ? 'Balanced simulation'
                                : 'Suggested practice'}
                        </p>
                        <p className="text-sm text-zinc-300 mt-1">
                          <span className="text-zinc-500">Reason: </span>
                          {(orchestratedRecommendation ?? trainingRecommendation)!.rationale}
                        </p>
                        {orchestratedRecommendation?.difficultyLevel ? (
                          <p className="text-xs text-zinc-500 mt-1">
                            Difficulty: {orchestratedRecommendation.difficultyLevel}
                          </p>
                        ) : null}
                        {(orchestratedRecommendation ?? trainingRecommendation)?.confidence ? (
                          <p className="text-xs text-zinc-500 mt-1">
                            Confidence: {(orchestratedRecommendation ?? trainingRecommendation)!.confidence}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                        style={{ backgroundColor: NAVY_ACCENT }}
                        onClick={launchRecommendedNextStep}
                        title={
                          (orchestratedRecommendation ?? trainingRecommendation)!.recommendedMode === 'drill'
                            ? 'Start focused drill'
                            : (orchestratedRecommendation ?? trainingRecommendation)!.recommendedMode ===
                                'adaptive'
                              ? 'Start adaptive training'
                              : 'Start normal simulation'
                        }
                      >
                        {(orchestratedRecommendation ?? trainingRecommendation)!.recommendedMode === 'drill'
                          ? 'Start drill'
                          : (orchestratedRecommendation ?? trainingRecommendation)!.recommendedMode ===
                              'adaptive'
                            ? 'Start adaptive training'
                            : 'Start normal simulation'}
                      </button>
                    </div>
                    {((orchestratedRecommendation ?? trainingRecommendation)?.sourceFactors?.length ?? 0) >
                    0 ? (
                      <ul className="text-xs text-zinc-500 list-disc list-inside space-y-0.5">
                        {(orchestratedRecommendation ?? trainingRecommendation)!.sourceFactors!.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}

              {userId && backendConnected && chatMode === 'roleplay' && trainingAssignments.length > 0 ? (
                <div className="rounded-lg border border-violet-900/40 bg-violet-950/20 px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-violet-400/90 uppercase tracking-wide">
                    Manager assigned
                  </p>
                  <ul className="space-y-2">
                    {trainingAssignments.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-200"
                      >
                        <span>
                          <span className="text-zinc-500">{a.teamName}</span>
                          {' · '}
                          {SKILL_LABELS[a.skill]} ({a.assignmentType})
                          {a.targetUserId ? (
                            <span className="text-zinc-500 text-xs"> · direct</span>
                          ) : (
                            <span className="text-zinc-500 text-xs"> · team-wide</span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg text-xs font-medium text-white"
                          style={{ backgroundColor: NAVY_ACCENT }}
                          onClick={() => startFromAssignment(a)}
                        >
                          {a.assignmentType === 'drill' ? 'Start drill' : 'Start adaptive'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {userId && backendConnected && chatMode === 'roleplay' && trainingAnalytics ? (
                <TrainingInsightsSection
                  analytics={trainingAnalytics}
                  trainingRecommendation={trainingRecommendation}
                />
              ) : null}

              {/* Chat Window */}
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden relative">
                {chatMode === 'roleplay' && simulationMode === 'generic' && conversationId && (
                  <div className="border-b border-zinc-800 px-4 py-2 bg-zinc-950/60">
                    <p className="text-xs text-zinc-500">
                      <span className="text-zinc-400 font-medium">Normal simulation — </span>
                      standard customer chat without weakness-targeted pressures.
                    </p>
                  </div>
                )}
                {chatMode === 'roleplay' && simulationMode === 'adaptive' && conversationId && (
                  <div className="border-b border-zinc-700/80 px-4 py-2 bg-zinc-950/80">
                    {activeRoleplayScenario ? (
                      <p className="text-xs text-zinc-400">
                        <span className="text-zinc-500 font-medium">Adaptive · Scenario focus: </span>
                        {activeRoleplayScenario.coachingFocusSummary}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        Detailed scenario metadata isn&apos;t available for this session (older or generic adaptive run).
                      </p>
                    )}
                  </div>
                )}
                {chatMode === 'roleplay' && simulationMode === 'drill' && conversationId && (
                  <div className="border-b border-amber-900/30 px-4 py-2 bg-amber-950/30">
                    {activeDrillScenario ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-amber-200/90">Focused drill</p>
                        <p className="text-xs text-zinc-400">
                          <span className="text-zinc-500">Focus: </span>
                          {activeDrillScenario.coachingFocusSummary}
                        </p>
                        {activeDrillScenario.drillObjective ? (
                          <p className="text-xs text-zinc-500">{activeDrillScenario.drillObjective}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Drill metadata isn&apos;t available for this session.</p>
                    )}
                  </div>
                )}
                {/* Messages */}
                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-zinc-500">
                        {chatMode === 'roleplay'
                          ? `Start a conversation with ${selectedPersona?.name || 'the customer'}...`
                          : 'Ask the assistant for help with your sales conversation...'}
                      </p>
                    </div>
                  ) : (
                    messages.map((m, idx) => (
                      <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                            m.role === 'user' ? 'text-white' : 'bg-zinc-800 text-zinc-100'
                          }`}
                          style={m.role === 'user' ? { backgroundColor: NAVY_ACCENT } : {}}
                        >
                          <div className="text-xs text-zinc-400 mb-1">
                            {m.role === 'user' ? 'You (Sales Associate)' : selectedPersona?.name || 'Customer'}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                          {m.role === 'assistant' && (
                            <div className="mt-1.5 flex justify-end">
                              <button
                                type="button"
                                title={speakingIdx === idx ? 'Stop audio' : 'Play as audio'}
                                onClick={() => toggleSpeak(idx, m.content)}
                                className={`rounded p-1 transition-all ${
                                  speakingIdx === idx
                                    ? 'text-blue-400 hover:text-blue-300'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                {speakingIdx === idx ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="4" y="4" width="16" height="16" rx="2" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-800 rounded-xl px-4 py-3">
                        <Spinner size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-zinc-700 p-4">
                  <div className="flex gap-2 items-center">
                    <input
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type as the sales associate..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={sending}
                    />
                    {typeof window !== 'undefined' &&
                      (window.SpeechRecognition ?? window.webkitSpeechRecognition) && (
                        <button
                          type="button"
                          title={isRecording ? 'Stop recording' : 'Speak your response'}
                          disabled={sending || (chatMode === 'roleplay' && !personaId)}
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`flex-shrink-0 rounded-lg p-2.5 transition-all disabled:opacity-50 ${
                            isRecording
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                          </svg>
                        </button>
                      )}
                    <button
                      className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center gap-2"
                      style={{ backgroundColor: NAVY_ACCENT }}
                      disabled={!canSend}
                      onClick={sendMessage}
                    >
                      {sending && <Spinner size="sm" />}
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>

              {chatMode === 'roleplay' &&
                liveCoachTipsEnabled &&
                liveCoachTip &&
                !liveCoachTipDismissed && (
                  <div className="rounded-lg border border-teal-900/50 bg-teal-950/25 px-4 py-3 text-sm text-teal-50/95">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500/90 mb-1">
                          Coach tip · {SKILL_LABELS[liveCoachTip.kind]}
                        </p>
                        <p className="text-zinc-100 leading-snug">{liveCoachTip.message}</p>
                        {liveCoachTip.rationale ? (
                          <details className="mt-2 text-xs text-zinc-500">
                            <summary className="cursor-pointer text-teal-600/90 hover:text-teal-400">
                              Why this tip
                            </summary>
                            <p className="mt-1 pl-0.5">{liveCoachTip.rationale}</p>
                          </details>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 underline"
                        onClick={() => setLiveCoachTipDismissed(true)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

              {/* Grade Button */}
              <div className="flex items-center gap-4">
                <button
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
                  disabled={!conversationId || grading}
                  onClick={() => gradeConversation()}
                >
                  {grading && <Spinner size="sm" />}
                  {grading ? 'Grading...' : 'Grade Conversation'}
                </button>
                {!conversationId && <span className="text-xs text-zinc-500">Send at least one message first</span>}
              </div>

              {/* Coaching evaluation (V1) */}
              {coachingEvaluation && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-6">
                  <h3 className="text-lg font-semibold">Coaching feedback</h3>
                  <CoachingNarrativeSection summary={coachingEvaluation.summary} />
                  {progressSnapshot && progressConversationId === conversationId ? (
                    <ProgressSection snapshot={progressSnapshot} />
                  ) : null}
                  {progressSnapshot && progressConversationId === conversationId ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Practice this next</p>
                      <div className="flex flex-wrap gap-2">
                        {progressSnapshot.recommendedFocusSkills.slice(0, 3).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-600 text-zinc-200 hover:bg-zinc-800 transition-colors"
                            onClick={() => {
                              startDrillForSkill(s);
                              setActiveTab('Roleplay');
                            }}
                          >
                            Train {SKILL_LABELS[s]}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="text-xs text-amber-400/90 hover:text-amber-300 underline"
                        onClick={() =>
                          pinTrainingFocusFromProgress(progressSnapshot.recommendedFocusSkills, 3)
                        }
                      >
                        Pin recommended skills for 3 graded sessions
                      </button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                    <span>Questions (associate): {coachingEvaluation.summary.questionCount}</span>
                    <span>Avg message length: {coachingEvaluation.summary.avgMessageLength.toFixed(0)} chars</span>
                    <span>Talk ratio: {(coachingEvaluation.summary.talkRatio * 100).toFixed(0)}%</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {coachingEvaluation.skillScores.map((s) => {
                      const trend = coachingEvaluation.weaknessProfile?.find((p) => p.skill === s.skill);
                      return (
                        <div key={s.id} className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-3">
                          <div className="text-xs text-zinc-400 mb-1 flex items-center justify-between gap-1">
                            <span>{SKILL_LABELS[s.skill]}</span>
                            {trend && (
                              <span
                                className="text-zinc-500"
                                title={trend.trendDirection}
                              >
                                {trendArrow(trend.trendDirection)}
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-semibold text-white">{s.score}</div>
                          <p className="text-xs text-zinc-500 mt-2 line-clamp-4">{s.reasoning}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-amber-400 mb-2">Top weaknesses</h4>
                    <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                      {coachingEvaluation.summary.weaknesses.map((w) => (
                        <li key={w}>{SKILL_LABELS[w as SalesSkillKey] ?? w}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-emerald-400 mb-2">Recommended tips</h4>
                    <ul className="list-decimal list-inside text-sm text-zinc-300 space-y-2">
                      {coachingEvaluation.summary.recommendedTips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                      style={{ backgroundColor: NAVY_ACCENT }}
                      onClick={trainWeaknesses}
                    >
                      Train my weaknesses
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-zinc-600 text-sm font-medium hover:bg-zinc-800 transition-all"
                      onClick={startNormalSimulation}
                    >
                      Start a normal simulation
                    </button>
                  </div>
                </div>
              )}

              {/* Legacy evaluation (older conversations only) */}
              {!coachingEvaluation && evaluation && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                  <h3 className="text-lg font-semibold mb-4">Feedback (legacy)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <Score label="Storytelling" value={evaluation.storytelling} />
                    <Score label="Emotional" value={evaluation.emotional} />
                    <Score label="Persuasion" value={evaluation.persuasion} />
                    <Score label="Product Knowledge" value={evaluation.productKnow} />
                    <Score label="Total" value={evaluation.total} max={40} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium text-emerald-400 mb-2">✓ Strengths</h4>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{evaluation.strengths}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-400 mb-2">→ Tips to Improve</h4>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{evaluation.tips}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCRIPT GENERATOR TAB */}
        {/* ================================================================= */}
        {activeTab === 'Script Generator' && (
          <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
            {/* Settings Panel */}
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                <h2 className="text-lg font-semibold mb-4">Generate Script</h2>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs text-zinc-400 mb-1 block">Product</span>
                    <select
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      value={scriptProductId}
                      onChange={(e) => setScriptProductId(e.target.value)}
                      disabled={loadingProducts}
                    >
                      <option value="">Select a product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.price ? `($${p.price})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-zinc-400 mb-1 block">Customer Persona</span>
                    <select
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      value={scriptPersonaId}
                      onChange={(e) => setScriptPersonaId(e.target.value)}
                      disabled={loadingPersonas}
                    >
                      <option value="">Select a persona...</option>
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-zinc-400 mb-1 block">Tone</span>
                    <select
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={scriptTone}
                      onChange={(e) => setScriptTone(e.target.value)}
                    >
                      {TONES.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    className="w-full py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: NAVY_ACCENT }}
                    disabled={!canGenerateScript}
                    onClick={generateScript}
                  >
                    {generatingScript && <Spinner size="sm" />}
                    {generatingScript ? 'Generating...' : 'Generate Script'}
                  </button>
                </div>
              </div>

              {/* Product Preview */}
              {scriptProductId && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-3">Product Preview</h3>
                  {(() => {
                    const product = products.find((p) => p.id === scriptProductId);
                    if (!product) return null;
                    return (
                      <div className="space-y-2">
                        <div className="text-white font-medium">{product.name}</div>
                        {product.brand && <div className="text-xs text-zinc-500">{product.brand}</div>}
                        {product.price && (
                          <div className="text-lg font-bold" style={{ color: '#60a5fa' }}>
                            ${product.price}
                          </div>
                        )}
                        {product.description && <p className="text-sm text-zinc-400">{product.description}</p>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Script Output */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden relative">
              <div className="flex items-center justify-between border-b border-zinc-700 px-5 py-3">
                <h3 className="font-semibold">Generated Script</h3>
                {generatedScript && <CopyButton text={generatedScript} />}
              </div>
              <div className="p-5 min-h-[500px] relative">
                {generatingScript && <LoadingOverlay message="Generating your personalized script..." />}
                {!generatingScript && generatedScript ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed">
                      {generatedScript}
                    </pre>
                  </div>
                ) : !generatingScript ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-zinc-500 text-center">
                      Select a product, persona, and tone,
                      <br />
                      then click "Generate Script"
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* FEEDBACK TAB */}
        {/* ================================================================= */}
        {activeTab === 'Feedback' && (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Conversation List */}
            <aside className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                Your Conversations ({conversations.length})
              </h2>

              <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 relative">
                {loadingConversations && conversations.length === 0 && (
                  <div className="text-center py-4">
                    <Spinner size="sm" />
                  </div>
                )}
                {!loadingConversations && conversations.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No conversations to review</p>
                ) : (
                  conversations.map((conv) => (
                    <ConversationListItem
                      key={conv.id}
                      conversation={conv}
                      isSelected={conv.id === selectedConversationId}
                      onClick={() => setSelectedConversationId(conv.id)}
                    />
                  ))
                )}
              </div>
            </aside>

            {/* Selected Conversation Details */}
            <div>
              {!selectedConversationId ? (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-8 text-center">
                  <p className="text-zinc-500">Select a conversation to view details and feedback</p>
                </div>
              ) : selectedConversation ? (
                <div className="space-y-6">
                  {/* Conversation Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{selectedConversation.persona?.name}</h2>
                      <p className="text-sm text-zinc-400">{new Date(selectedConversation.createdAt).toLocaleString()}</p>
                    </div>
                    <button
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center gap-2"
                      style={{ backgroundColor: NAVY_ACCENT }}
                      disabled={feedbackGrading}
                      onClick={handleRegradeClick}
                    >
                      {feedbackGrading && <Spinner size="sm" />}
                      {feedbackGrading
                        ? 'Grading...'
                        : selectedConversation.evaluation || selectedConversation.coachingEvaluation
                          ? 'Re-grade'
                          : 'Grade Conversation'}
                    </button>
                  </div>

                  {/* Transcript */}
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
                    <div className="border-b border-zinc-700 px-5 py-3">
                      <h3 className="font-semibold">Transcript</h3>
                    </div>
                    <div className="p-5 max-h-[300px] overflow-y-auto space-y-3">
                      {selectedConversation.messages.map((m, idx) => (
                        <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                              m.role === 'user' ? 'text-white' : 'bg-zinc-800 text-zinc-100'
                            }`}
                            style={m.role === 'user' ? { backgroundColor: NAVY_ACCENT } : {}}
                          >
                            <div className="text-xs text-zinc-400 mb-1">{m.role === 'user' ? 'Sales Associate' : 'Customer'}</div>
                            <div className="text-sm">{m.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Summary */}
                  {selectedConversation.coachingEvaluation ? (
                    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Coaching feedback</h3>
                        <span className="text-xs text-zinc-500">
                          {new Date(selectedConversation.coachingEvaluation.summary.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <CoachingNarrativeSection summary={selectedConversation.coachingEvaluation.summary} />
                      {progressSnapshot && progressConversationId === selectedConversationId ? (
                        <ProgressSection snapshot={progressSnapshot} />
                      ) : null}
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                        <span>Questions: {selectedConversation.coachingEvaluation.summary.questionCount}</span>
                        <span>Avg length: {selectedConversation.coachingEvaluation.summary.avgMessageLength.toFixed(0)}</span>
                        <span>Talk ratio: {(selectedConversation.coachingEvaluation.summary.talkRatio * 100).toFixed(0)}%</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {selectedConversation.coachingEvaluation.skillScores.map((s) => (
                          <div key={s.id} className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-3">
                            <div className="text-xs text-zinc-400 mb-1">{SKILL_LABELS[s.skill]}</div>
                            <div className="text-xl font-semibold text-white">{s.score}</div>
                            <p className="text-xs text-zinc-500 mt-2 line-clamp-4">{s.reasoning}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Top weaknesses</h4>
                        <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                          {selectedConversation.coachingEvaluation.summary.weaknesses.map((w) => (
                            <li key={w}>{SKILL_LABELS[w as SalesSkillKey] ?? w}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-emerald-400 mb-2">Recommended tips</h4>
                        <ul className="list-decimal list-inside text-sm text-zinc-300 space-y-2">
                          {selectedConversation.coachingEvaluation.summary.recommendedTips.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : selectedConversation.evaluation ? (
                    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Feedback Summary (legacy)</h3>
                        <span className="text-xs text-zinc-500">
                          Graded {new Date(selectedConversation.evaluation.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                        <Score label="Storytelling" value={selectedConversation.evaluation.storytelling} />
                        <Score label="Emotional" value={selectedConversation.evaluation.emotional} />
                        <Score label="Persuasion" value={selectedConversation.evaluation.persuasion} />
                        <Score label="Product Knowledge" value={selectedConversation.evaluation.productKnow} />
                        <Score label="Total" value={selectedConversation.evaluation.total} max={40} />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg bg-emerald-900/20 border border-emerald-800/50 p-4">
                          <h4 className="text-sm font-medium text-emerald-400 mb-2">✓ What Went Well</h4>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedConversation.evaluation.strengths}</p>
                        </div>
                        <div className="rounded-lg bg-amber-900/20 border border-amber-800/50 p-4">
                          <h4 className="text-sm font-medium text-amber-400 mb-2">→ Improve Next Time</h4>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedConversation.evaluation.tips}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-8 text-center">
                      <div className="text-zinc-500 mb-4">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        This conversation hasn't been graded yet
                      </div>
                      <button
                        className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2 mx-auto"
                        style={{ backgroundColor: NAVY_ACCENT }}
                        onClick={() => gradeFeedbackConversation()}
                        disabled={feedbackGrading}
                      >
                        {feedbackGrading && <Spinner size="sm" />}
                        {feedbackGrading ? 'Grading...' : 'Grade Now'}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === 'Team' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
              <h2 className="text-lg font-semibold">Create a team</h2>
              <p className="text-sm text-zinc-500">
                Managers can add reps by user ID, assign drills or adaptive practice, and view team skill
                trends. Reps see assignments on the Roleplay tab.
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <label className="block flex-1 min-w-[200px]">
                  <span className="text-xs text-zinc-400 block mb-1">Team name</span>
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. West Region"
                  />
                </label>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: NAVY_ACCENT }}
                  onClick={() => void handleCreateTeam()}
                  disabled={!userId || !newTeamName.trim()}
                >
                  Create team
                </button>
              </div>
            </div>

            {myTeams.length > 0 ? (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <label className="block max-w-md">
                  <span className="text-xs text-zinc-400 mb-1 block">Active team</span>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    {myTeams.map((t) => (
                      <option key={t.teamId} value={t.teamId}>
                        {t.name} ({t.role})
                      </option>
                    ))}
                  </select>
                </label>

                {teamPanelLoading ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Spinner size="sm" /> Loading team analytics…
                  </div>
                ) : teamAnalytics ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-zinc-950/50 border border-zinc-700/70 p-4">
                      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                        Team skill overview
                      </h3>
                      <p className="text-sm text-zinc-400 mb-2">
                        Total graded sessions (team): {teamAnalytics.totalSessions}
                        {teamAnalytics.averageProgress != null ? (
                          <span className="ml-2 tabular-nums">
                            · Avg rep progress: {teamAnalytics.averageProgress.toFixed(2)}
                          </span>
                        ) : null}
                      </p>
                      {teamAnalytics.teamWeakestSkill ? (
                        <p className="text-sm text-zinc-300">
                          <span className="text-zinc-500">Weakest skill: </span>
                          {SKILL_LABELS[teamAnalytics.teamWeakestSkill]}
                        </p>
                      ) : null}
                      {teamAnalytics.teamStrongestSkill ? (
                        <p className="text-sm text-zinc-300">
                          <span className="text-zinc-500">Strongest skill: </span>
                          {SKILL_LABELS[teamAnalytics.teamStrongestSkill]}
                        </p>
                      ) : null}
                      <ul className="mt-2 text-sm text-zinc-400 space-y-1">
                        {teamAnalytics.skills.map((s) => (
                          <li key={s.skill}>
                            {SKILL_LABELS[s.skill]}: {s.averageScore.toFixed(1)} avg
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isManagerForSelectedTeam ? (
                      <>
                        <div className="rounded-lg bg-zinc-950/50 border border-zinc-700/70 p-4 space-y-3">
                          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Add rep</h3>
                          <p className="text-xs text-zinc-600">
                            Paste their ThreadNotion user ID (shown in the app header).
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <input
                              className="flex-1 min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                              placeholder="User ID"
                              value={addMemberId}
                              onChange={(e) => setAddMemberId(e.target.value)}
                            />
                            <input
                              className="flex-1 min-w-[140px] rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                              placeholder="Display name (optional)"
                              value={addMemberDisplayName}
                              onChange={(e) => setAddMemberDisplayName(e.target.value)}
                            />
                            <button
                              type="button"
                              className="px-4 py-2 rounded-lg text-sm text-white"
                              style={{ backgroundColor: NAVY_ACCENT }}
                              onClick={() => void handleAddTeamMember()}
                            >
                              Add to team
                            </button>
                          </div>
                        </div>

                        <div className="rounded-lg bg-zinc-950/50 border border-zinc-700/70 p-4 space-y-3">
                          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                            Assign practice
                          </h3>
                          <div className="flex flex-wrap gap-2 items-center">
                            <select
                              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm"
                              value={assignSkill}
                              onChange={(e) => setAssignSkill(e.target.value as SalesSkillKey)}
                            >
                              {(Object.keys(SKILL_LABELS) as SalesSkillKey[]).map((k) => (
                                <option key={k} value={k}>
                                  {SKILL_LABELS[k]}
                                </option>
                              ))}
                            </select>
                            <select
                              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm"
                              value={assignType}
                              onChange={(e) => setAssignType(e.target.value as 'drill' | 'adaptive')}
                            >
                              <option value="drill">Drill</option>
                              <option value="adaptive">Adaptive</option>
                            </select>
                            <input
                              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm flex-1 min-w-[140px]"
                              placeholder="Target user ID (optional)"
                              value={assignTargetUserId}
                              onChange={(e) => setAssignTargetUserId(e.target.value)}
                            />
                            <button
                              type="button"
                              className="px-4 py-2 rounded-lg text-sm text-white"
                              style={{ backgroundColor: NAVY_ACCENT }}
                              onClick={() => void handleCreateAssignment()}
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {isManagerForSelectedTeam && teamMembers.length > 0 ? (
                      <div className="rounded-lg bg-zinc-950/50 border border-zinc-700/70 p-4 overflow-x-auto">
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                          Rep overview
                        </h3>
                        <table className="w-full text-left text-sm text-zinc-300">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-700">
                              <th className="py-2 pr-2">Rep</th>
                              <th className="py-2 pr-2">Sessions</th>
                              <th className="py-2 pr-2">Strongest</th>
                              <th className="py-2 pr-2">Weakest</th>
                              <th
                                className="py-2 pr-2"
                                title="Max skill improvement rate (early vs recent window)"
                              >
                                Δ max
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamMembers.map((m) => {
                              const an = memberTrainingAnalytics[m.userId];
                              return (
                                <tr key={m.userId} className="border-b border-zinc-800">
                                  <td className="py-2 pr-2">
                                    {repDisplayLabel(m.userId)}
                                    <span className="text-zinc-600 text-xs block">{m.role}</span>
                                  </td>
                                  <td className="py-2 pr-2 tabular-nums">{an?.sessionsAnalyzed ?? 0}</td>
                                  <td className="py-2 pr-2">
                                    {an?.strongestSkill ? SKILL_LABELS[an.strongestSkill] : '—'}
                                  </td>
                                  <td className="py-2 pr-2">
                                    {an?.weakestSkill ? SKILL_LABELS[an.weakestSkill] : '—'}
                                  </td>
                                  <td className="py-2 pr-2 tabular-nums">
                                    {maxImprovementAcrossSkills(an).toFixed(1)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {!isManagerForSelectedTeam ? (
                      <p className="text-sm text-zinc-500">
                        Rep roster and assignments are managed by team managers. Team averages above include
                        your graded runs with everyone on this team.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Could not load team analytics.</p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Re-grade Confirmation Modal */}
      <ConfirmModal
        isOpen={showRegradeModal}
        title="Re-grade Conversation?"
        message="This will replace the current coaching evaluation for this conversation."
        onConfirm={gradeFeedbackConversation}
        onCancel={() => setShowRegradeModal(false)}
        loading={feedbackGrading}
      />
    </main>
  );
}
