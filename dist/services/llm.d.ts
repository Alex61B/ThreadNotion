import 'dotenv/config';
export type Msg = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};
export type LlmUsage = {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
};
type JudgeInput = {
    rubric: string;
    transcript: string;
    persona: string;
};
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
export declare const llm: {
    chat(messages: Msg[]): Promise<string>;
    chatWithUsage(messages: Msg[]): Promise<{
        content: string;
        usage: LlmUsage;
    }>;
    judge(input: JudgeInput): Promise<JudgeOutput>;
    /**
     * Structured evaluation for six canonical sales skills. Caller must validate with Zod.
     */
    evaluateSalesSkills(input: EvaluateSalesSkillsInput): Promise<unknown>;
    generateScript(args: GenerateScriptArgs): Promise<GenerateScriptOutput>;
};
export {};
//# sourceMappingURL=llm.d.ts.map