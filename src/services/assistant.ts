import type { Trip } from '../types';

export interface AssistantContext {
  destination?: string;
  startDate?: string;
  endDate?: string;
  travelType?: Trip['travelType'];
  tripTitle?: string;
  preferences?: string;
  availableResources?: string[];
}

export interface AssistantSuggestion {
  id: string;
  title: string;
  detail: string;
  category: 'activity' | 'itinerary' | 'transport' | 'weather' | 'tip';
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: AssistantSuggestion[];
  timestamp: string;
}

export interface AssistantResponse {
  text: string;
  suggestions: AssistantSuggestion[];
  followUpQuestions: string[];
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

function formatDates(startDate?: string, endDate?: string): string {
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  if (startDate) return `starting ${startDate}`;
  if (endDate) return `ending ${endDate}`;
  return 'your selected dates';
}

function destinationIdeas(destination: string): AssistantSuggestion[] {
  const d = destination.trim();
  const lower = normalize(d);
  const ideas: Array<[string, string, AssistantSuggestion['category']]> = [
    [`Explore top highlights in ${d}`, `Start with a half-day orientation walk covering major landmarks and a local market in ${d}.`, 'activity'],
    [`Local food experience in ${d}`, `Try a guided food stop or a well-reviewed local eatery to sample regional dishes in ${d}.`, 'activity'],
    [`Relaxed cultural itinerary`, `Plan a museum/cultural morning and a scenic neighborhood afternoon to balance pace in ${d}.`, 'itinerary'],
  ];

  if (lower.includes('beach') || lower.includes('bali') || lower.includes('phuket') || lower.includes('maldives')) {
    ideas.unshift([`Beach and sunset plan`, `Schedule beach time early, hydrate often, and reserve a sunset viewpoint in ${d}.`, 'itinerary']);
  } else if (lower.includes('tokyo') || lower.includes('kyoto') || lower.includes('japan')) {
    ideas.unshift([`Transit-friendly day plan`, `Group sights by neighborhood and use local rail passes/routes for efficient travel in ${d}.`, 'transport']);
  } else if (lower.includes('paris') || lower.includes('rome') || lower.includes('london')) {
    ideas.unshift([`Landmark + neighborhood mix`, `Combine one iconic landmark with a walkable historic district for a balanced day in ${d}.`, 'itinerary']);
  }

  return ideas.slice(0, 4).map(([title, detail, category], i) => ({
    id: makeId(`sug-${i}`),
    title,
    detail,
    category,
  }));
}

function weatherGuidance(context?: AssistantContext): AssistantSuggestion[] {
  const dest = context?.destination?.trim() || 'your destination';
  return [
    {
      id: makeId('weather'),
      title: `Weather check for ${dest}`,
      detail: `I can help plan around conditions for ${formatDates(context?.startDate, context?.endDate)}. Since this build uses local mock guidance only, check a saved/local forecast fixture in-app and pack layers plus rain/sun protection as needed.`,
      category: 'weather',
    },
  ];
}

function transportGuidance(context?: AssistantContext): AssistantSuggestion[] {
  const dest = context?.destination?.trim() || 'the area';
  return [
    {
      id: makeId('transport'),
      title: `Getting around ${dest}`,
      detail: `For ${formatDates(context?.startDate, context?.endDate)}, compare walking routes, public transit, and trusted local taxi options. Keep offline copies of key addresses and allow buffer time for transfers.`,
      category: 'transport',
    },
  ];
}

export function buildTripContextSummary(context?: AssistantContext): string {
  if (!context) return 'No trip context provided yet.';
  const parts: string[] = [];
  if (context.tripTitle) parts.push(`Trip: ${context.tripTitle}`);
  if (context.destination) parts.push(`Destination: ${context.destination}`);
  if (context.startDate || context.endDate) parts.push(`Dates: ${formatDates(context.startDate, context.endDate)}`);
  if (context.travelType) parts.push(`Travel type: ${context.travelType}`);
  if (context.preferences?.trim()) parts.push(`Preferences: ${context.preferences.trim()}`);
  if (context.availableResources?.length) parts.push(`Available resources: ${context.availableResources.join(', ')}`);
  return parts.length ? parts.join(' • ') : 'Trip context is available but incomplete.';
}

export function getDefaultPrompts(context?: AssistantContext): AssistantResponse {
  const destination = context?.destination?.trim();
  const hasDates = Boolean(context?.startDate || context?.endDate);

  if (!destination && !hasDates) {
    return {
      text:
        'I can help plan your trip using local, on-device guidance (no external AI calls). Tell me your destination and travel dates, or ask about activities, weather, or transport.',
      suggestions: [
        { id: makeId('def'), title: 'Share destination and dates', detail: 'Example: “Plan 3 days in Kyoto from 2026-12-10 to 2026-12-12.”', category: 'itinerary' },
        { id: makeId('def'), title: 'Ask for activities', detail: 'Example: “Suggest family-friendly activities and food spots.”', category: 'activity' },
        { id: makeId('def'), title: 'Ask about transport or weather', detail: 'Example: “How should I get around and what should I pack for the weather?”', category: 'transport' },
      ],
      followUpQuestions: [
        'Where are you traveling?',
        'What are your travel dates?',
        'What kind of trip is this (leisure, family, business, adventure, etc.)?',
      ],
    };
  }

  const where = destination || 'your destination';
  return {
    text: `I have context for ${where}${hasDates ? ` (${formatDates(context?.startDate, context?.endDate)})` : ''}. Ask for trip ideas, daily itinerary suggestions, weather guidance, or transport tips. I’ll respond with deterministic local recommendations only.`,
    suggestions: destination ? destinationIdeas(destination) : [
      { id: makeId('ctx'), title: 'Add a destination', detail: 'Share a destination so I can suggest relevant activities and itinerary ideas.', category: 'itinerary' },
    ],
    followUpQuestions: [
      'Want a 1-day or multi-day plan?',
      'Any preferences (food, culture, outdoors, family-friendly)?',
      'Do you need weather or transport guidance?',
    ],
  };
}

export function generateAssistantResponse(userInput: string, context?: AssistantContext): AssistantResponse {
  const input = normalize(userInput);
  if (!input) {
    return getDefaultPrompts(context);
  }

  const destination = context?.destination?.trim();
  const asksWeather = /weather|rain|temperature|hot|cold|forecast|pack/.test(input);
  const asksTransport = /transport|getting around|get around|bus|train|metro|taxi|airport|transfer|commute|ride/.test(input);
  const asksActivities = /activity|activities|things to do|suggest|ideas|itinerary|plan|trip|visit|see|do/.test(input);
  const asksGreeting = /^(hi|hello|hey|help)\b/.test(input);

  const suggestions: AssistantSuggestion[] = [];
  const followUpQuestions: string[] = [];

  if (asksActivities || (!asksWeather && !asksTransport && (destination || asksGreeting))) {
    if (destination) {
      suggestions.push(...destinationIdeas(destination));
      if (context?.startDate || context?.endDate) {
        suggestions.unshift({
          id: makeId('dates'),
          title: `Plan for ${formatDates(context.startDate, context.endDate)}`,
          detail: `Create a simple day-by-day plan in ${destination}: mornings for key sights, afternoons for local experiences, and evenings for flexible dining/rest.`,
          category: 'itinerary',
        });
      }
    } else {
      suggestions.push({
        id: makeId('need-dest'),
        title: 'Destination needed for tailored suggestions',
        detail: 'Share a destination and dates so I can suggest relevant activities and a practical itinerary.',
        category: 'itinerary',
      });
    }
  }

  if (asksWeather) suggestions.push(...weatherGuidance(context));
  if (asksTransport) suggestions.push(...transportGuidance(context));

  if (suggestions.length === 0) {
    suggestions.push({
      id: makeId('generic'),
      title: 'How I can help',
      detail: 'Ask for trip ideas, itinerary planning, weather guidance, or transport tips. I provide local mock suggestions based on your trip context only. No external AI or network calls are used.',
      category: 'tip',
    });
  }

  // Ensure category-specific guidance is present when explicitly asked
  if (asksTransport && !suggestions.some((s) => s.category === 'transport')) {
    suggestions.push(...transportGuidance(context));
  }
  if (asksWeather && !suggestions.some((s) => s.category === 'weather')) {
    suggestions.push(...weatherGuidance(context));
  }

  const contextLine = context?.destination || context?.startDate || context?.endDate || context?.travelType
    ? `Using your trip context (${buildTripContextSummary(context)}). `
    : '';

  let text: string;
  if (asksGreeting && !asksActivities && !asksWeather && !asksTransport) {
    text = `${contextLine}Hi! I can suggest activities, help plan your itinerary, and give weather or transport guidance using local mock recommendations. What would you like to plan?`;
  } else if (destination && (asksActivities || asksWeather || asksTransport)) {
    text = `${contextLine}Here are local mock travel suggestions for ${destination}. You can refine them by telling me your pace, interests, or budget.`;
  } else if (!destination && asksActivities) {
    text = `${contextLine}I can suggest trip ideas once I know your destination and dates. Share those details and I’ll provide relevant options.`;
  } else {
    text = `${contextLine}Here is helpful local guidance based on your request. No external AI or network calls are used.`;
  }

  if (!destination) followUpQuestions.push('What destination should I plan for?');
  if (!(context?.startDate || context?.endDate)) followUpQuestions.push('What are your travel dates?');
  if (!asksWeather) followUpQuestions.push('Would you like weather or packing guidance?');
  if (!asksTransport) followUpQuestions.push('Do you need transport tips for getting around?');

  return {
    text,
    suggestions: suggestions.slice(0, 5),
    followUpQuestions: followUpQuestions.slice(0, 3),
  };
}

export function createAssistantMessage(role: AssistantMessage['role'], text: string, suggestions?: AssistantSuggestion[]): AssistantMessage {
  return {
    id: makeId('msg'),
    role,
    text,
    suggestions,
    timestamp: new Date().toISOString(),
  };
}
