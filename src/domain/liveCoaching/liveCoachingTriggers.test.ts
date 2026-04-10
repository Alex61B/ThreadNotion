import { describe, it, expect } from 'vitest';
import {
  detectBuyingSignalInCustomerMessage,
  detectDiscoveryGap,
  detectEmpathySignalInCustomerMessage,
  detectFeatureHeavyUserTurn,
  detectObjectionInCustomerMessage,
  detectProductQuestionInCustomerMessage,
  userLineLooksLikeQuestion,
} from './liveCoachingTriggers';

describe('liveCoachingTriggers', () => {
  it('detectObjectionInCustomerMessage is case-insensitive', () => {
    expect(detectObjectionInCustomerMessage('That is Too Expensive for me')).toBe(true);
    expect(detectObjectionInCustomerMessage('Love it, no notes')).toBe(false);
  });

  it('detectEmpathySignalInCustomerMessage finds hesitation wording', () => {
    expect(detectEmpathySignalInCustomerMessage('I feel overwhelmed by choices')).toBe(true);
    expect(detectEmpathySignalInCustomerMessage('What sizes do you have?')).toBe(false);
  });

  it('detectBuyingSignalInCustomerMessage', () => {
    expect(detectBuyingSignalInCustomerMessage("Sounds good — I'll take it")).toBe(true);
    expect(detectBuyingSignalInCustomerMessage('Maybe I will come back later')).toBe(false);
  });

  it('detectProductQuestionInCustomerMessage', () => {
    expect(detectProductQuestionInCustomerMessage('What is this made of?')).toBe(true);
    expect(detectProductQuestionInCustomerMessage('Nice weather today')).toBe(false);
  });

  it('detectFeatureHeavyUserTurn requires length, no question mark, spec tokens', () => {
    const heavy =
      'This fabric is one hundred percent organic cotton with breathable moisture wicking and durable certified construction for everyday wear and comfort.';
    expect(detectFeatureHeavyUserTurn(heavy)).toBe(true);
    expect(detectFeatureHeavyUserTurn('Cotton blend?')).toBe(false);
    expect(detectFeatureHeavyUserTurn('short')).toBe(false);
  });

  it('userLineLooksLikeQuestion', () => {
    expect(userLineLooksLikeQuestion('Can you tell me more?')).toBe(true);
    expect(userLineLooksLikeQuestion('what size runs small')).toBe(true);
    expect(userLineLooksLikeQuestion('Just looking thanks')).toBe(false);
  });

  it('detectDiscoveryGap fires early with few question-like user lines', () => {
    const hit = detectDiscoveryGap({
      userMessagesContents: ['Hi there', 'I need a shirt'],
      userTurnIndex: 2,
    });
    expect(hit).not.toBeNull();
    expect(hit!.kind).toBe('discovery_questions');
  });

  it('detectDiscoveryGap does not fire after early window', () => {
    expect(
      detectDiscoveryGap({
        userMessagesContents: ['Hi', 'Hmm', 'Ok', 'Sure', 'Maybe'],
        userTurnIndex: 5,
      })
    ).toBeNull();
  });
});
