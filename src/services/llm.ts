import 'dotenv/config';
import OpenAI from 'openai';
import { EvaluationError } from '../errors/evaluationErrors';
import type { PlaybookStep, ExampleResponse } from '../domain/coaching/momentPlaybooks';
import type { MomentType } from '../schemas/momentCoaching';

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

export type MomentClassificationInput = {
  transcript: string;
  momentTypeDescriptions: Array<{
    id: string;
    label: string;
    customerSignals: string[];
  }>;
};

export type MomentEvaluationInput = {
  transcript: string;
  personaName: string;
  momentsToEvaluate: Array<{
    momentType: MomentType;
    label: string;
    customerExcerpt: string;
    associateExcerpt: string;
    customerTurnIndex: number;
    associateTurnIndex: number;
    playbookSteps: PlaybookStep[];
    strongExample: ExampleResponse;
    weakExample: ExampleResponse;
    coachingGuidance: string;
  }>;
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
- coaching.strengths: 0–6 items. May be empty if there were genuinely no strengths. The "skill" field MUST be exactly one of: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy — do not invent names like "rapport_building" or "active_listening". What went well—be specific to behaviors visible in the transcript.
- coaching.improvementAreas: 1–6 items. The "skill" field MUST be exactly one of: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy — do not invent names. What to improve—tie to skills and concrete gaps (not generic negativity).
- coaching.keyMoments: 0–6 items. May be empty if the conversation was too short to identify moments. The "skill" field MUST be exactly one of: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy — do not invent names. Each moment must reference the NUMBERED transcript (e.g. turn [3] or a short quote from USER/ASSISTANT lines). Optional customerMessage/userMessage: short excerpts from those turns when helpful.
- coaching.nextTimeFocus: 1–5 short bullets for the next practice session.
- coaching.overallCoachingSummary: REQUIRED. 2–5 sentences; supportive, specific, actionable—like a coach debrief. Always include this even if the interaction was brief.
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

  async classifyConversationMoments(input: MomentClassificationInput): Promise<unknown> {
    const systemPrompt = `You are an expert retail sales training analyst. Identify specific "conversational moments" \
in a fashion/apparel sales transcript — (customer message, associate response) pairs where the customer expressed \
a concern, need, or buying signal that called for a specific sales skill.

Only flag moments that are clearly present. Do not invent moments from vague or neutral exchanges.

Return ONLY valid JSON (no markdown) matching this exact shape:
{
  "detectedMoments": [
    {
      "momentType": "<id from the provided list>",
      "customerTurnIndex": <1-based turn number from transcript>,
      "associateTurnIndex": <1-based turn number from transcript>,
      "customerExcerpt": "<short quote from customer turn, max 200 chars>",
      "associateExcerpt": "<short quote from associate turn, max 200 chars>",
      "confidence": "high" | "medium"
    }
  ]
}

Rules:
- momentType MUST be one of the IDs from the provided moment type list.
- customerTurnIndex and associateTurnIndex are the [n] numbers from the numbered transcript.
- Only include moments with confidence "high" or "medium". Skip low-confidence or ambiguous cases.
- detectedMoments may be an empty array if no clear moments are present.
- Maximum 6 detected moments per transcript.
- Prefer quality over quantity — 2 precise detections are better than 5 uncertain ones.`;

    const userPrompt = `Moment types to detect:
${JSON.stringify(input.momentTypeDescriptions, null, 2)}

Numbered transcript (USER = sales associate, ASSISTANT = customer):
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
      console.error('[llm.classifyConversationMoments] Malformed JSON from classifier model');
      throw new EvaluationError('Moment classifier returned malformed JSON', 'EVALUATOR_PARSE', err);
    }
  },

  async evaluateMomentResponses(input: MomentEvaluationInput): Promise<unknown> {
    const systemPrompt = `You are an expert retail sales coach evaluating a training transcript. \
For each conversational moment provided, assess how well the sales associate (USER messages) \
handled it against the provided playbook steps.

Be directional and fair — a step is "addressed" if the associate clearly attempted it, even imperfectly. \
You are looking for whether the spirit of each step was present, not an exact word-for-word match.

Return ONLY valid JSON (no markdown) matching this exact shape:
{
  "momentEvaluations": [
    {
      "momentType": "<same id as in input>",
      "overallHandling": "strong" | "partial" | "missed",
      "stepResults": [
        {
          "stepNumber": <number>,
          "addressed": true | false,
          "observation": "<one sentence: what they did or failed to do>"
        }
      ],
      "missedStepNumbers": [<step numbers the associate skipped or failed>],
      "betterResponseExample": "<2–4 sentence example of a stronger response grounded in the actual customer excerpt>",
      "coachingSummary": "<2–3 sentences: what happened, what was missed, what to try next time>"
    }
  ]
}

Rules:
- momentEvaluations MUST contain one entry per moment in the input, in the same order.
- overallHandling: "strong" = 3 or more steps addressed; "partial" = 1 or 2 steps addressed; "missed" = 0 steps addressed.
- stepResults must include one entry per playbook step for that moment.
- betterResponseExample must be grounded in the actual customer excerpt — not a generic template.
- Tone: specific, encouraging, constructive. Never harsh or condescending.`;

    const userPrompt = `Customer persona: ${input.personaName}

Full transcript for context:
${input.transcript}

Moments to evaluate (${input.momentsToEvaluate.length} total):
${JSON.stringify(input.momentsToEvaluate, null, 2)}`;

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
      console.error('[llm.evaluateMomentResponses] Malformed JSON from rubric model');
      throw new EvaluationError('Moment rubric evaluator returned malformed JSON', 'EVALUATOR_PARSE', err);
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
