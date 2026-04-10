import type { SalesSkill } from '../../schemas/coaching';
import { normalizeTipKey, TIP_TEMPLATES_BY_SKILL } from './tipTemplates';

const MAX_TIPS = 8;

/**
 * Merge LLM tips with deterministic templates for top weaknesses.
 * Dedupes by normalized string; caps length.
 */
export function mergeRecommendedTips(args: {
  llmTips: string[];
  weaknesses: SalesSkill[];
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  function push(tip: string) {
    const k = normalizeTipKey(tip);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(tip.trim());
  }

  for (const t of args.llmTips) {
    push(t);
    if (out.length >= MAX_TIPS) return out;
  }

  for (const w of args.weaknesses) {
    for (const template of TIP_TEMPLATES_BY_SKILL[w]) {
      push(template);
      if (out.length >= MAX_TIPS) return out;
    }
  }

  return out;
}
