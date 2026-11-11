import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Trip } from '../../types';
import { useTripStore } from '../../stores/tripStore';
import {
  buildTripContextSummary,
  createAssistantMessage,
  generateAssistantResponse,
  getDefaultPrompts,
  type AssistantContext,
  type AssistantMessage,
} from '../../services/assistant';

export interface TravelAssistantProps {
  tripContext?: AssistantContext;
  trip?: Trip | null;
  availableResources?: string[];
  className?: string;
}

function contextFromTrip(trip?: Trip | null): AssistantContext | undefined {
  if (!trip) return undefined;
  return {
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelType: trip.travelType,
    tripTitle: trip.title,
  };
}

export const TravelAssistant: React.FC<TravelAssistantProps> = ({
  tripContext,
  trip,
  availableResources,
  className,
}) => {
  const { trips, activeTripId } = useTripStore();
  const storeTrip = useMemo(() => trip || trips.find((t) => t.id === activeTripId) || null, [trip, trips, activeTripId]);

  const resolvedContext = useMemo<AssistantContext | undefined>(() => {
    const base = contextFromTrip(storeTrip);
    const merged = {
      ...base,
      ...tripContext,
      availableResources: tripContext?.availableResources || availableResources || base?.availableResources,
    };
    const hasAny = Object.values(merged).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
    return hasAny ? merged : undefined;
  }, [storeTrip, tripContext, availableResources]);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializedKey, setInitializedKey] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const contextKey = useMemo(() => buildTripContextSummary(resolvedContext), [resolvedContext]);

  useEffect(() => {
    if (initializedKey === contextKey) return;
    const intro = getDefaultPrompts(resolvedContext);
    setMessages([createAssistantMessage('assistant', intro.text, intro.suggestions)]);
    setInitializedKey(contextKey);
    setError(null);
  }, [contextKey, initializedKey, resolvedContext]);

  useEffect(() => {
    const el = endRef.current as (HTMLDivElement & { scrollIntoView?: (opts?: ScrollIntoViewOptions) => void }) | null;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isResponding]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      const prompt = getDefaultPrompts(resolvedContext);
      setMessages((prev) => [
        ...prev,
        createAssistantMessage('assistant', `${prompt.text} You can also ask: ${prompt.followUpQuestions.join(' ')}`, prompt.suggestions),
      ]);
      return;
    }

    setError(null);
    setMessages((prev) => [...prev, createAssistantMessage('user', trimmed)]);
    setInput('');
    setIsResponding(true);

    try {
      // Deterministic local "thinking" delay for conversational/loading state; no network calls.
      await new Promise((resolve) => setTimeout(resolve, 150));
      const response = generateAssistantResponse(trimmed, resolvedContext);
      const assistantText = response.followUpQuestions.length
        ? `${response.text}\n\nFollow-up: ${response.followUpQuestions.join(' ')}`
        : response.text;
      setMessages((prev) => [...prev, createAssistantMessage('assistant', assistantText, response.suggestions)]);
    } catch {
      setError('Unable to generate local suggestions right now. Please try again.');
    } finally {
      setIsResponding(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className={`space-y-4 ${className || ''}`} aria-label="AI Travel Assistant">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">AI Travel Assistant</h1>
        <p className="text-sm text-slate-400 mt-1">
          Context-aware local/mock travel help for destinations, trip planning, weather, and transport. No external AI provider calls and no trip data is transmitted.
        </p>
        <div className="mt-3 text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2">
          <span className="font-semibold text-slate-200">Context: </span>
          {resolvedContext ? buildTripContextSummary(resolvedContext) : 'No destination/dates provided yet — ask for help to get started.'}
        </div>
      </div>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-4 sm:p-6" aria-labelledby="assistant-chat-heading">
        <h2 id="assistant-chat-heading" className="sr-only">Conversation</h2>

        {messages.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400">
            <p className="text-sm">No messages yet. Enter a destination and dates or ask for trip ideas.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1" aria-live="polite">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`rounded-2xl px-4 py-3 border ${msg.role === 'user' ? 'bg-sky-500/10 border-sky-500/30 ml-6' : 'bg-slate-950/60 border-slate-800 mr-6'}`}
              >
                <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <p className="text-sm text-slate-100 whitespace-pre-wrap">{msg.text}</p>
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2" aria-label="Suggestions">
                    {msg.suggestions.map((s) => (
                      <li key={s.id} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                        <div className="text-sm font-medium text-white">{s.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.detail}</div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">{s.category}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
            {isResponding && (
              <div className="rounded-2xl px-4 py-3 border bg-slate-950/60 border-slate-800 mr-6" role="status" aria-live="polite">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-1">Assistant</div>
                <p className="text-sm text-slate-300">Preparing local suggestions…</p>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {error && (
          <div role="alert" className="mt-3 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-2">
          <label htmlFor="assistant-input" className="block text-xs font-semibold text-slate-300">Ask for trip help</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Suggest activities in Kyoto for 3 days, or ask about weather/transport"
              className="flex-1 rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={isResponding}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium"
            >
              {isResponding ? 'Thinking…' : 'Send'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => void sendMessage('Suggest trip ideas and a simple itinerary')} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700">Trip ideas</button>
            <button type="button" onClick={() => void sendMessage('What should I know about weather and packing?')} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700">Weather guidance</button>
            <button type="button" onClick={() => void sendMessage('How can I get around by transport?')} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700">Transport tips</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default TravelAssistant;
