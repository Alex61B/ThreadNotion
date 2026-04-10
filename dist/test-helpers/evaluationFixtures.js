"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validEvaluatorOutput = validEvaluatorOutput;
/** Deterministic valid payload matching SalesEvaluationLLMSchema (for mocked LLM). */
function validEvaluatorOutput() {
    const skill = (score, reasoning) => ({ score, reasoning });
    return {
        skills: {
            discovery_questions: skill(7, 'Solid discovery.'),
            objection_handling: skill(6, 'Handled some objections.'),
            product_knowledge: skill(8, 'Good product detail.'),
            closing: skill(5, 'Weak close.'),
            storytelling: skill(7, 'Adequate stories.'),
            empathy: skill(6, 'Some empathy.'),
        },
        topWeaknesses: [
            'closing',
            'objection_handling',
            'empathy',
        ],
        recommendedTips: ['Ask more follow-ups', 'Confirm next steps'],
        coaching: {
            strengths: [
                { skill: 'product_knowledge', explanation: 'Explained fabric and fit with specifics.' },
                { skill: 'discovery_questions', explanation: 'Opened with relevant questions early on.' },
            ],
            improvementAreas: [
                { skill: 'closing', explanation: 'Did not propose a clear next step before the customer left.' },
                { skill: 'empathy', explanation: 'Could acknowledge hesitation more directly.' },
            ],
            keyMoments: [
                {
                    skill: 'closing',
                    userMessage: 'Let me know if you need anything else.',
                    whyItMatters: 'Ended the exchange without checking interest or offering a concrete next step.',
                    suggestedApproach: 'Try: "Want to try it on? I can grab your size."',
                },
                {
                    skill: 'discovery_questions',
                    customerMessage: 'Just browsing today.',
                    whyItMatters: 'A chance to learn occasion or priorities was left on the table.',
                    suggestedApproach: 'Follow with one open question about what they are shopping for.',
                },
            ],
            nextTimeFocus: [
                'Ask one more discovery question after the first customer reply.',
                'Propose a next step when interest seems high.',
            ],
            overallCoachingSummary: 'You showed strong product knowledge. Focus the next session on closing momentum and one more discovery beat before recommendations.',
        },
    };
}
//# sourceMappingURL=evaluationFixtures.js.map