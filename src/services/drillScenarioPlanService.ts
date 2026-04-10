import type { SalesSkill } from '../schemas/coaching';
import type { AdaptiveScenarioPlan } from '../schemas/adaptiveScenarioPlan';
import type { DrillPlanStored } from '../schemas/drillPlan';
import { mergeWeaknessesForScenario } from '../domain/adaptive/weaknessCoherence';
import {
  pickPressureByIndex,
  type PressureOption,
} from '../domain/adaptive/weaknessPressureCatalog';
import { drillVariantIndexFromSeed } from '../domain/drill/drillVariations';
import type { PersonaSlice, ProductSlice } from './adaptiveScenarioPlanService';
import { enrichAdaptiveScenarioPlanWithRealism } from '../domain/simulationRealism/enrichPlan';

function uniqueById(tactics: PressureOption[]): PressureOption[] {
  const seen = new Set<string>();
  const out: PressureOption[] = [];
  for (const t of tactics) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

/**
 * Deterministic focused drill: explicit skills + catalog rotation via variantSeed.
 * Produces a persisted `DrillPlanStored` and the `AdaptiveScenarioPlan` used for prompting.
 */
export function buildDrillScenarioPlan(args: {
  primarySkill: SalesSkill;
  secondarySkill?: SalesSkill;
  persona: PersonaSlice;
  product: ProductSlice;
  variantSeed: string;
  realismSeed?: string;
}): { stored: DrillPlanStored; promptPlan: AdaptiveScenarioPlan } {
  const { primarySkill, secondarySkill, persona, product, variantSeed, realismSeed } = args;

  const ordered: SalesSkill[] = [primarySkill];
  if (secondarySkill && secondarySkill !== primarySkill) {
    ordered.push(secondarySkill);
  }

  const coherence = mergeWeaknessesForScenario(ordered);
  const skills = coherence.skills;

  const personaSummary = `You are shopping as ${persona.name}, matching the tone and values described in your persona.`;

  const productLine = product
    ? `You are looking at ${product.title}${product.brand ? ` (${product.brand})` : ''}${
        product.price != null ? ` around $${product.price}` : ''
      }.`
    : 'You are browsing clothing and may or may not have a specific item in mind yet.';

  const customerContext = `Setting: a clothing and fashion retail store (focused practice drill). ${productLine}`;

  const primaryIdx = drillVariantIndexFromSeed(variantSeed, primarySkill, 'primary');
  const secondaryIdx =
    secondarySkill && secondarySkill !== primarySkill
      ? drillVariantIndexFromSeed(variantSeed, secondarySkill, 'secondary')
      : primaryIdx + 1;

  const tactics: PressureOption[] = [];
  for (const skill of skills) {
    const idx =
      skill === primarySkill
        ? primaryIdx
        : skill === secondarySkill
          ? secondaryIdx
          : drillVariantIndexFromSeed(variantSeed, skill, 'coherence');
    tactics.push(pickPressureByIndex(skill, idx));
  }
  if (skills.length === 1) {
    tactics.push(pickPressureByIndex(primarySkill, primaryIdx + 1));
  }

  const pressureTactics = uniqueById(tactics)
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      label: p.label,
      customerLine: p.customerLine,
    }));

  const variantKey = pressureTactics.map((t) => t.id).join('+');

  const scenarioGoal =
    skills.length === 0
      ? 'Keep the interaction short and realistic; let the associate practice one clear skill.'
      : `Single-purpose drill: within the first 1–2 exchanges, steer the scene so the associate must use ${skills.length === 1 ? 'this skill' : 'these skills'}—no extended browsing small talk.`;

  const conversationConstraints = [
    'This is a focused drill: in your first reply as the customer, move toward the situation where the associate must demonstrate the targeted skill—do not stall with filler.',
    'Keep the whole exchange tight: get to the skill-relevant tension quickly; replies stay short (about one to four sentences).',
    'Stay plausible for a real shopper—no lectures, no meta-talk about training or scores.',
    'Do not name internal coaching labels or say you are testing the associate.',
  ];

  const coachingFocusSummary =
    skills.length === 0
      ? 'Drill: neutral customer stance.'
      : coherence.scenarioTheme
        ? `Drill: ${coherence.scenarioTheme.slice(0, 180)}${coherence.scenarioTheme.length > 180 ? '…' : ''}`
        : `Drill targeting: ${skills.join(', ')}.`;

  const rationaleParts: string[] = [`Drill mode. Primary=${primarySkill}.`];
  if (secondarySkill) rationaleParts.push(`Secondary=${secondarySkill}.`);
  rationaleParts.push(`Variant=${variantKey}.`);
  if (coherence.droppedSkills.length) {
    rationaleParts.push(`Coherence dropped: ${coherence.droppedSkills.join(', ')}.`);
  }

  const basePromptPlan: AdaptiveScenarioPlan = {
    targetWeaknesses: skills,
    personaSummary,
    customerContext,
    scenarioGoal,
    pressureTactics,
    conversationConstraints,
    coachingFocusSummary,
    scenarioRationale: rationaleParts.join(' '),
    scenarioTheme: coherence.scenarioTheme,
  };
  const promptPlan = realismSeed
    ? enrichAdaptiveScenarioPlanWithRealism(basePromptPlan, `${realismSeed}:drill`, persona.name)
    : basePromptPlan;

  const drillObjective =
    skills.length === 0
      ? 'Practice a tight retail exchange with clear feedback opportunities.'
      : `Practice ${skills.join(' and ')} in a short, realistic scene.`;

  const stored: DrillPlanStored = {
    mode: 'drill',
    primarySkill,
    secondarySkill: secondarySkill && secondarySkill !== primarySkill ? secondarySkill : undefined,
    variantKey,
    coachingFocusSummary,
    drillObjective,
    promptPlan,
  };

  return { stored, promptPlan };
}
