import 'dotenv/config';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

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

export const llm = {
  async chat(messages: Msg[]): Promise<string> {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });

    return completion.choices[0]?.message?.content ?? '';
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
