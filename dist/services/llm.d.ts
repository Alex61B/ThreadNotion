import 'dotenv/config';
export type Msg = {
    role: 'system' | 'user' | 'assistant';
    content: string;
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
export declare const llm: {
    chat(messages: Msg[]): Promise<string>;
    judge(input: JudgeInput): Promise<JudgeOutput>;
    generateScript(args: GenerateScriptArgs): Promise<GenerateScriptOutput>;
};
export {};
//# sourceMappingURL=llm.d.ts.map