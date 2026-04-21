import 'dotenv/config';
import OpenAI from 'openai';
import { EvaluationError } from '../errors/evaluationErrors';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
export type LlmUsage = { promptTokens: number; completionTokens: number; totalTokens: number };

type JudgeInput = { rubric: string; transcript: string; persona: string };
type JudgeOutput = {
  storytelling: number;
  emotional: number;
  persuasion: number;
  productKnow: number;
  total: number;
  strengths: string;
  tips: string;
};

type GenerateScriptArgs = {
  product: any;
  persona?: any;
  tone: string;
  steps: number;
};

type GenerateScriptOutput = {
  persona: string;
  script: string[];
};

export type EvaluateSalesSkillsInput = {
  transcript: string;
  personaName: string;
  metrics: {
    questionCount: number;
    avgMessageLength: number;
    talkRatio: number;
  };
};

export const llm = {
  async chat(messages: Msg[]): Promise<string> {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });

    return completion.choices[0]?.message?.content ?? '';
  },

  async chatWithUsage(messages: Msg[]): Promise<{ content: string; usage: LlmUsage }> {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });
    const usage = completion.usage;
    return {
      content: completion.choices[0]?.message?.content ?? '',
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
    };
  },

  async judge(input: JudgeInput): Promise<JudgeOutput> {
    const systemPrompt = `
You are a sales coach. Score the associate on:
- storytelling (0–10)
- emotional (0–10)
- persuasion (0–10)
- productKnow (0–10)

Return ONLY valid JSON with keys:
storytelling, emotional, persuasion, productKnow, total, strengths, tips.
"total" should be the sum of the four scores.
`;

    const userPrompt = `
Rubric:
${input.rubric}

Persona:
${input.persona}

Transcript:
${input.transcript}
`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    return JSON.parse(raw) as JudgeOutput;
  },

  /**
   * Structured evaluation for six canonical sales skills. Caller must validate with Zod.
   */
  async evaluateSalesSkills(input: EvaluateSalesSkillsInput): Promise<unknown> {
    const systemPrompt = `You are an expert sales coach for fashion/apparel retail.
Score the sales associate (the USER messages in the transcript) on six skills from 1 to 10.
Be fair: use the full range. Consider both quality and the quantitative metrics provided.

Return ONLY valid JSON matching this exact shape (no markdown):
{
  "skills": {
    "discovery_questions": { "score": number, "reasoning": string },
    "objection_handling": { "score": number, "reasoning": string },
    "product_knowledge": { "score": number, "reasoning": string },
    "closing": { "score": number, "reasoning": string },
    "storytelling": { "score": number, "reasoning": string },
    "empathy": { "score": number, "reasoning": string }
  },
  "topWeaknesses": [ string, string, string ],
  "recommendedTips": [ string, ... ],
  "coaching": {
    "strengths": [ { "skill": "<one of: discovery_questions|objection_handling|product_knowledge|closing|storytelling|empathy>", "explanation": string } ],
    "improvementAreas": [ { "skill": "<one of: discovery_questions|objection_handling|product_knowledge|closing|storytelling|empathy>", "explanation": string } ],
    "keyMoments": [ {
      "skill": "<one of: discovery_questions|objection_handling|product_knowledge|closing|storytelling|empathy>",
      "customerMessage": string,
      "userMessage": string,
      "whyItMatters": string,
      "suggestedApproach": string
    } ],
    "nextTimeFocus": [ string ],
    "overallCoachingSummary": string
  }
}

Rules:
- Each score must be an integer from 1 to 10.
- topWeaknesses must list exactly three skill keys from: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy — ordered by priority (weakest first).
- recommendedTips: 3–6 short, actionable tips; prioritize the weakest skills.
- coaching.strengths: 1–6 items. The "skill" field MUST be exactly one of: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy — do not invent names like "rapport_building" or "active_listening". What went well—be specific to behaviors visible in the transcript.
- coaching.improvementAreas: 1–6 items. The "skill" field MUST be exactly one of: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy — do not invent names. What to improve—tie to skills and concrete gaps (not generic negativity).
- coaching.keyMoments: 2–6 items. The "skill" field MUST be exactly one of: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy — do not invent names. Each moment must reference the NUMBERED transcript (e.g. turn [3] or a short quote from USER/ASSISTANT lines). Optional customerMessage/userMessage: short excerpts from those turns when helpful.
- coaching.nextTimeFocus: 1–5 short bullets for the next practice session.
- coaching.overallCoachingSummary: 2–5 sentences; supportive, specific, actionable—like a coach debrief.
- Tone: professional, encouraging, never insulting.`;

    const userPrompt = `Customer persona name: ${input.personaName}

Quantitative signals (associate = user messages):
- questionCount: ${input.metrics.questionCount}
- avgMessageLength (chars): ${input.metrics.avgMessageLength.toFixed(1)}
- talkRatio (associate chars / total chars): ${input.metrics.talkRatio.toFixed(3)}

Numbered transcript (USER = sales associate, ASSISTANT = customer). Use [n] turn numbers when explaining key moments:
${input.transcript}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    try {
      return JSON.parse(raw) as unknown;
    } catch (err) {
      console.error('[llm.evaluateSalesSkills] Malformed JSON from evaluator model');
      throw new EvaluationError(
        'Evaluator returned malformed JSON',
        'EVALUATOR_PARSE',
        err
      );
    }
  },

  async generateScript(args: GenerateScriptArgs): Promise<GenerateScriptOutput> {
    const personaName = args.persona?.name ?? 'General Shopper';

    const prompt = `
You are a skilled in-store retail associate creating a ${args.steps}-step selling script.

Write in a way that:
- Sounds natural and conversational, not like an advertisement.
- Avoids slang like "fire", "hype-approved", or internet speak.
- Uses at most 2 short sentences per step.
- Minimizes exclamation marks; only use one in the final close if it feels earned.
- Focuses on discovery, benefits, and clear next steps.

Persona (shopper):
${JSON.stringify(args.persona ?? { name: personaName })}

Product:
${JSON.stringify(args.product)}

Tone (adapt, but stay grounded and professional):
${args.tone}

Return ONLY valid JSON with:
{
  "persona": string,
  "script": string[]
}
`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    return JSON.parse(raw) as GenerateScriptOutput;
  },
};
