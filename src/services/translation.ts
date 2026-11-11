import type { TranslationPhrase } from '../types';
import {
  bundledPhrases,
  mockImageCaptions,
  mockTextTranslations,
  translationPacks,
  type LocalTranslationPhrase,
} from '../fixtures/translation/phrases';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'ja';
export type TranslationMode = 'text' | 'voice' | 'camera';

export interface TextTranslationResult {
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  sourceText: string;
  translatedText: string;
  matchedFrom: 'phrase-pack' | 'mock-dictionary' | 'fallback';
  offline: true;
}

export interface VoiceCaptureResult {
  status: 'captured' | 'unsupported' | 'permission-denied' | 'error';
  transcript?: string;
  message: string;
}

export interface ImageTranslationResult {
  status: 'translated' | 'fallback';
  caption: string;
  detectedText?: string;
  translatedText?: string;
  targetLanguage: SupportedLanguage;
  message: string;
  offline: true;
}

export interface EmergencyPhraseInput {
  situation: string;
  personName?: string;
  location?: string;
  medicalNeed?: string;
  targetLanguage: SupportedLanguage;
}

export interface SavedPackState {
  downloadedPackIds: string[];
  favoritePhraseIds: string[];
}

const STORAGE_KEY = 'traveller.translation.local.v1';

const languageLabels: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  ja: 'Japanese',
};

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export function getSupportedLanguages(): Array<{ code: SupportedLanguage; label: string }> {
  return (Object.keys(languageLabels) as SupportedLanguage[]).map((code) => ({
    code,
    label: languageLabels[code],
  }));
}

export function getAvailablePacks() {
  return translationPacks.map((pack) => ({ ...pack, offline: true as const }));
}

export function getBundledPhrases(targetLanguage?: SupportedLanguage): LocalTranslationPhrase[] {
  if (!targetLanguage || targetLanguage === 'en') return [...bundledPhrases];
  return bundledPhrases.filter((phrase) => phrase.targetLanguage === targetLanguage);
}

export function loadSavedPackState(): SavedPackState {
  const storage = getStorage();
  if (!storage) return { downloadedPackIds: [], favoritePhraseIds: [] };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { downloadedPackIds: [], favoritePhraseIds: [] };
    const parsed = JSON.parse(raw) as Partial<SavedPackState>;
    return {
      downloadedPackIds: Array.isArray(parsed.downloadedPackIds) ? parsed.downloadedPackIds.filter((v): v is string => typeof v === 'string') : [],
      favoritePhraseIds: Array.isArray(parsed.favoritePhraseIds) ? parsed.favoritePhraseIds.filter((v): v is string => typeof v === 'string') : [],
    };
  } catch {
    return { downloadedPackIds: [], favoritePhraseIds: [] };
  }
}

export function savePackState(state: SavedPackState): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function togglePackDownload(packId: string): SavedPackState {
  const state = loadSavedPackState();
  const hasPack = state.downloadedPackIds.includes(packId);
  const next: SavedPackState = {
    ...state,
    downloadedPackIds: hasPack
      ? state.downloadedPackIds.filter((id) => id !== packId)
      : [...state.downloadedPackIds, packId],
  };
  savePackState(next);
  return next;
}

export function toggleFavoritePhrase(phraseId: string): SavedPackState {
  const state = loadSavedPackState();
  const isFavorite = state.favoritePhraseIds.includes(phraseId);
  const next: SavedPackState = {
    ...state,
    favoritePhraseIds: isFavorite
      ? state.favoritePhraseIds.filter((id) => id !== phraseId)
      : [...state.favoritePhraseIds, phraseId],
  };
  savePackState(next);
  return next;
}

export function translateTextLocally(
  sourceText: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage,
): TextTranslationResult {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    return {
      sourceLanguage,
      targetLanguage,
      sourceText: '',
      translatedText: '',
      matchedFrom: 'fallback',
      offline: true,
    };
  }

  if (sourceLanguage === targetLanguage) {
    return {
      sourceLanguage,
      targetLanguage,
      sourceText: trimmed,
      translatedText: trimmed,
      matchedFrom: 'fallback',
      offline: true,
    };
  }

  const normalizedSource = normalize(trimmed);
  const phraseMatch = bundledPhrases.find(
    (phrase) =>
      phrase.sourceLanguage === sourceLanguage &&
      phrase.targetLanguage === targetLanguage &&
      normalize(phrase.sourceText) === normalizedSource,
  );
  if (phraseMatch) {
    return {
      sourceLanguage,
      targetLanguage,
      sourceText: trimmed,
      translatedText: phraseMatch.translatedText,
      matchedFrom: 'phrase-pack',
      offline: true,
    };
  }

  const dict = mockTextTranslations[targetLanguage];
  const dictMatch = sourceLanguage === 'en' && dict ? dict[normalizedSource] : undefined;
  if (dictMatch) {
    return {
      sourceLanguage,
      targetLanguage,
      sourceText: trimmed,
      translatedText: dictMatch,
      matchedFrom: 'mock-dictionary',
      offline: true,
    };
  }

  const targetLabel = languageLabels[targetLanguage];
  return {
    sourceLanguage,
    targetLanguage,
    sourceText: trimmed,
    translatedText: `[${targetLabel} mock translation] ${trimmed}`,
    matchedFrom: 'fallback',
    offline: true,
  };
}

export function generateEmergencyPhrase(input: EmergencyPhraseInput): TranslationPhrase {
  const { situation, personName, location, medicalNeed, targetLanguage } = input;
  const safeSituation = situation.trim() || 'I need urgent help';
  const details = [
    personName?.trim() ? `My name is ${personName.trim()}` : null,
    location?.trim() ? `I am at ${location.trim()}` : null,
    medicalNeed?.trim() ? `Medical need: ${medicalNeed.trim()}` : null,
  ].filter(Boolean);
  const sourceText = details.length > 0 ? `${safeSituation}. ${details.join('. ')}.` : `${safeSituation}.`;

  const translated = translateTextLocally(sourceText, 'en', targetLanguage);
  return {
    id: `emergency-${Date.now()}`,
    category: 'emergency',
    sourceLanguage: 'en',
    targetLanguage,
    sourceText,
    translatedText: translated.translatedText,
    phoneticPronunciation: undefined,
    isFavorite: false,
    isEmergencyPhrase: true,
  };
}

export async function captureVoiceInput(): Promise<VoiceCaptureResult> {
  if (typeof window === 'undefined') {
    return { status: 'unsupported', message: 'Voice input is not available in this environment.' };
  }

  const speechWindow = window as Window & {
    SpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      stop: () => void;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: ((event: { error?: string }) => void) | null;
      onend: (() => void) | null;
    };
    webkitSpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      stop: () => void;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: ((event: { error?: string }) => void) | null;
      onend: (() => void) | null;
    };
  };

  const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!Recognition) {
    return {
      status: 'unsupported',
      message: 'Voice capture is not supported by this browser. Use text input or a bundled phrase instead. No audio is sent to external services.',
    };
  }

  return new Promise<VoiceCaptureResult>((resolve) => {
    try {
      const recognition = new Recognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      let settled = false;

      recognition.onresult = (event) => {
        if (settled) return;
        settled = true;
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
        resolve({
          status: transcript ? 'captured' : 'error',
          transcript: transcript || undefined,
          message: transcript
            ? 'Voice captured locally for mock translation. Audio was not sent to an external provider.'
            : 'No speech was captured. You can type text manually.',
        });
      };

      recognition.onerror = (event) => {
        if (settled) return;
        settled = true;
        const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
        resolve({
          status: denied ? 'permission-denied' : 'error',
          message: denied
            ? 'Microphone permission denied. Use text input or bundled phrases; no audio is transmitted.'
            : 'Voice capture failed. Use text input or bundled phrases as a safe local fallback.',
        });
      };

      recognition.onend = () => {
        if (settled) return;
        settled = true;
        resolve({
          status: 'error',
          message: 'Voice capture ended without a result. Use text input or bundled phrases.',
        });
      };

      recognition.start();
    } catch {
      resolve({
        status: 'error',
        message: 'Could not start voice capture. Use text input or bundled phrases as a safe local fallback.',
      });
    }
  });
}

export function getMockImageCaptionOptions(targetLanguage: SupportedLanguage) {
  return mockImageCaptions.filter((item) => item.targetLanguage === targetLanguage);
}

export function translateImageLocally(
  fileNameOrLabel: string,
  targetLanguage: SupportedLanguage,
): ImageTranslationResult {
  const normalized = normalize(fileNameOrLabel);
  const match = mockImageCaptions.find(
    (item) =>
      item.targetLanguage === targetLanguage &&
      (normalize(item.label) === normalized || normalized.includes(normalize(item.label).split(' ')[0])),
  );

  if (match) {
    return {
      status: 'translated',
      caption: `${match.detectedText} → ${match.translatedText}`,
      detectedText: match.detectedText,
      translatedText: match.translatedText,
      targetLanguage,
      message: 'Mock local image translation completed from bundled fixture. No image data was uploaded.',
      offline: true,
    };
  }

  return {
    status: 'fallback',
    caption: 'Camera/image translation unavailable for this image in local mock mode.',
    targetLanguage,
    message:
      'Safe local fallback: no image was sent to an external OCR/translation provider. Select a bundled sample sign or use text translation instead.',
    offline: true,
  };
}

export function getCameraSupportStatus(): { supported: boolean; message: string } {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      supported: false,
      message: 'Camera API is not available in this browser. Use bundled sample signs or text translation; no image capture is attempted.',
    };
  }
  return {
    supported: true,
    message: 'Camera API detected. For privacy-safe mock mode, use a bundled sample sign or local image label; images are not uploaded or sent to external providers.',
  };
}

export function getVoiceSupportStatus(): { supported: boolean; message: string } {
  if (typeof window === 'undefined') {
    return { supported: false, message: 'Voice input unavailable in this environment.' };
  }
  const speechWindow = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  const supported = Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
  return {
    supported,
    message: supported
      ? 'Speech recognition API detected. Captured text is translated locally with mock fixtures only.'
      : 'Speech recognition is not supported. Use text input or bundled phrases as a local fallback.',
  };
}
