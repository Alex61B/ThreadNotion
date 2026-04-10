import { describe, it, expect } from 'vitest';
import { computeTranscriptMetrics, formatTranscript, formatTranscriptNumbered } from './transcriptMetrics';

describe('computeTranscriptMetrics', () => {
  it('counts user messages with question marks', () => {
    const m = computeTranscriptMetrics([
      { role: 'user', content: 'Hi?' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'No question here' },
    ]);
    expect(m.questionCount).toBe(1);
  });

  it('computes talk ratio', () => {
    const m = computeTranscriptMetrics([
      { role: 'user', content: 'abcd' },
      { role: 'assistant', content: 'abcdefgh' },
    ]);
    expect(m.talkRatio).toBeCloseTo(4 / 12, 5);
    expect(m.avgMessageLength).toBe(4);
  });
});

describe('formatTranscript', () => {
  it('joins roles and content', () => {
    const t = formatTranscript([{ role: 'user', content: 'a' }]);
    expect(t).toContain('USER:');
    expect(t).toContain('a');
  });
});

describe('formatTranscriptNumbered', () => {
  it('numbers each message from 1', () => {
    const msgs = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ];
    expect(formatTranscriptNumbered(msgs)).toBe('[1] USER: Hi\n[2] ASSISTANT: Hello');
  });

  it('differs from unnumbered transcript', () => {
    const msgs = [{ role: 'user', content: 'x' }];
    expect(formatTranscript(msgs)).not.toContain('[1]');
    expect(formatTranscriptNumbered(msgs)).toContain('[1]');
  });
});
