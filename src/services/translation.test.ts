import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureVoiceInput,
  generateEmergencyPhrase,
  getBundledPhrases,
  getCameraSupportStatus,
  getMockImageCaptionOptions,
  getVoiceSupportStatus,
  loadSavedPackState,
  toggleFavoritePhrase,
  togglePackDownload,
  translateImageLocally,
  translateTextLocally,
} from './translation';

describe('translation service (T-008 local mock)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('translates known text from bundled phrase pack without external services', () => {
    const result = translateTextLocally('Help!', 'en', 'es');
    expect(result.translatedText).toBe('¡Ayuda!');
    expect(result.matchedFrom).toBe('phrase-pack');
    expect(result.offline).toBe(true);
  });

  it('translates known dictionary text and falls back safely for unknown text', () => {
    const known = translateTextLocally('Thank you', 'en', 'fr');
    expect(known.translatedText).toBe('merci');
    expect(known.matchedFrom).toBe('mock-dictionary');

    const unknown = translateTextLocally('Can you recommend a quiet cafe?', 'en', 'es');
    expect(unknown.translatedText).toContain('[Spanish mock translation]');
    expect(unknown.matchedFrom).toBe('fallback');
  });

  it('returns bundled local phrases and emergency phrases by target language', () => {
    const esPhrases = getBundledPhrases('es');
    expect(esPhrases.length).toBeGreaterThan(0);
    expect(esPhrases.every((p) => p.targetLanguage === 'es')).toBe(true);
    expect(esPhrases.some((p) => p.isEmergencyPhrase)).toBe(true);
  });

  it('saves and toggles offline pack selections and favorites locally', () => {
    const afterDownload = togglePackDownload('pack-es');
    expect(afterDownload.downloadedPackIds).toContain('pack-es');

    const afterFavorite = toggleFavoritePhrase('phrase-es-help');
    expect(afterFavorite.favoritePhraseIds).toContain('phrase-es-help');

    const loaded = loadSavedPackState();
    expect(loaded.downloadedPackIds).toContain('pack-es');
    expect(loaded.favoritePhraseIds).toContain('phrase-es-help');

    const removed = togglePackDownload('pack-es');
    expect(removed.downloadedPackIds).not.toContain('pack-es');
  });

  it('generates an emergency phrase using local mock translation', () => {
    const phrase = generateEmergencyPhrase({
      situation: 'I need help',
      personName: 'Alex',
      location: 'Central Station',
      medicalNeed: 'asthma inhaler',
      targetLanguage: 'fr',
    });

    expect(phrase.isEmergencyPhrase).toBe(true);
    expect(phrase.category).toBe('emergency');
    expect(phrase.targetLanguage).toBe('fr');
    expect(phrase.sourceText).toContain('I need help');
    expect(phrase.translatedText.length).toBeGreaterThan(0);
  });

  it('provides mock image translation caption for bundled sample and safe fallback otherwise', () => {
    const options = getMockImageCaptionOptions('es');
    expect(options.length).toBeGreaterThan(0);

    const translated = translateImageLocally('Exit sign', 'es');
    expect(translated.status).toBe('translated');
    expect(translated.caption).toContain('SALIDA');
    expect(translated.offline).toBe(true);

    const fallback = translateImageLocally('Unknown sign photo', 'es');
    expect(fallback.status).toBe('fallback');
    expect(fallback.message).toMatch(/no image was sent/i);
  });

  it('reports unsupported voice/camera states as safe local fallbacks', async () => {
    const voiceStatus = getVoiceSupportStatus();
    expect(typeof voiceStatus.supported).toBe('boolean');
    expect(voiceStatus.message.length).toBeGreaterThan(0);

    vi.stubGlobal('navigator', {} as Navigator);
    const cameraStatus = getCameraSupportStatus();
    expect(cameraStatus.supported).toBe(false);
    expect(cameraStatus.message).toMatch(/not available|bundled sample|fallback/i);

    const capture = await captureVoiceInput();
    expect(['unsupported', 'error', 'permission-denied', 'captured']).toContain(capture.status);
    expect(capture.message.length).toBeGreaterThan(0);
  });

  it('keeps offline phrase pack/favorite selections local and handles permission-denied voice fallback', async () => {
    togglePackDownload('pack-fr');
    toggleFavoritePhrase('phrase-fr-help');
    const reloaded = loadSavedPackState();
    expect(reloaded.downloadedPackIds).toContain('pack-fr');
    expect(reloaded.favoritePhraseIds).toContain('phrase-fr-help');

    class DeniedRecognition {
      lang = 'en-US';
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        this.onerror?.({ error: 'not-allowed' });
      }
      stop() {}
    }

    vi.stubGlobal('window', { ...window, SpeechRecognition: DeniedRecognition, localStorage: window.localStorage } as any);
    const capture = await captureVoiceInput();
    expect(capture.status).toBe('permission-denied');
    expect(capture.message).toMatch(/no audio is transmitted|permission denied/i);
  });
});
