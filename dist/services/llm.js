"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llm = void 0;
require("dotenv/config");
const openai_1 = __importDefault(require("openai"));
const client = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
exports.llm = {
    async chat(messages) {
        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
        });
        return completion.choices[0]?.message?.content ?? '';
    },
    async judge(input) {
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
        return JSON.parse(raw);
    },
    async generateScript(args) {
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
        return JSON.parse(raw);
    },
};
//# sourceMappingURL=llm.js.map