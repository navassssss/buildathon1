import { describe, expect, it } from 'vitest';
import { buildTripContextSummary, generateAssistantResponse, getDefaultPrompts } from './assistant';

describe('assistant service (T-007 local mock)', () => {
  it('returns helpful defaults/questions when no input and no context', () => {
    const response = getDefaultPrompts();
    expect(response.text).toMatch(/destination and travel dates|local, on-device/i);
    expect(response.followUpQuestions.length).toBeGreaterThan(0);
    expect(response.suggestions.length).toBeGreaterThan(0);
  });

  it('returns context-aware defaults when destination and dates are provided', () => {
    const response = getDefaultPrompts({ destination: 'Kyoto', startDate: '2026-12-10', endDate: '2026-12-12' });
    expect(response.text).toMatch(/Kyoto/);
    expect(response.suggestions.length).toBeGreaterThan(0);
  });

  it('generates deterministic relevant suggestions for destination and dates', () => {
    const response = generateAssistantResponse('Suggest trip ideas and itinerary', {
      destination: 'Kyoto',
      startDate: '2026-12-10',
      endDate: '2026-12-12',
      travelType: 'leisure',
    });
    expect(response.text).toMatch(/Kyoto/);
    expect(response.suggestions.some((s) => /Kyoto|Plan for/i.test(`${s.title} ${s.detail}`))).toBe(true);
  });

  it('handles weather and transport questions with local guidance', () => {
    const weather = generateAssistantResponse('What about weather and packing?', { destination: 'Rome' });
    expect(weather.suggestions.some((s) => s.category === 'weather')).toBe(true);

    const transport = generateAssistantResponse('How do I get around by bus or taxi?', { destination: 'Rome' });
    expect(transport.suggestions.some((s) => s.category === 'transport' || /Getting around/i.test(s.title))).toBe(true);
  });

  it('asks for destination when planning request has no destination context', () => {
    const response = generateAssistantResponse('Plan activities for me', {});
    expect(response.text).toMatch(/destination/i);
    expect(response.followUpQuestions.some((q) => /destination/i.test(q))).toBe(true);
  });

  it('builds a readable trip context summary without transmitting data', () => {
    const summary = buildTripContextSummary({ tripTitle: 'Spring Break', destination: 'Lisbon', startDate: '2026-04-01', endDate: '2026-04-05' });
    expect(summary).toMatch(/Spring Break/);
    expect(summary).toMatch(/Lisbon/);
    expect(summary).toMatch(/2026-04-01/);
  });

  it('returns defaults for empty input and keeps responses local-only', () => {
    const response = generateAssistantResponse('   ', { destination: 'Rome' });
    expect(response.text).toMatch(/Rome/);
    expect(response.suggestions.length).toBeGreaterThan(0);

    const generic = generateAssistantResponse('zzz', {});
    expect(generic.text).toMatch(/No external AI or network calls are used/i);
    expect(generic.suggestions.some((s) => /No external AI or network calls are used/i.test(s.detail))).toBe(true);
  });
});
