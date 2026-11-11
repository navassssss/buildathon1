import React, { useMemo, useState } from 'react';
import {
  captureVoiceInput,
  generateEmergencyPhrase,
  getAvailablePacks,
  getBundledPhrases,
  getCameraSupportStatus,
  getMockImageCaptionOptions,
  getSupportedLanguages,
  getVoiceSupportStatus,
  loadSavedPackState,
  toggleFavoritePhrase,
  togglePackDownload,
  translateImageLocally,
  translateTextLocally,
  type SupportedLanguage,
} from '../../services/translation';

const languages = getSupportedLanguages().filter((l) => l.code !== 'en') as Array<{ code: SupportedLanguage; label: string }>;

export const TranslationTool: React.FC = () => {
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('es');
  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [textStatus, setTextStatus] = useState('Enter text to translate locally using bundled mock data.');
  const [voiceStatus, setVoiceStatus] = useState(getVoiceSupportStatus().message);
  const [cameraStatus] = useState(getCameraSupportStatus().message);
  const [imageLabel, setImageLabel] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageMessage, setImageMessage] = useState('Select a bundled sample sign or enter an image label. No images are uploaded.');
  const [savedState, setSavedState] = useState(loadSavedPackState());
  const [emergencySituation, setEmergencySituation] = useState('I need urgent help');
  const [emergencyLocation, setEmergencyLocation] = useState('');
  const [emergencyMedical, setEmergencyMedical] = useState('');
  const [emergencyResult, setEmergencyResult] = useState('');

  const phrases = useMemo(() => getBundledPhrases(targetLanguage), [targetLanguage]);
  const packs = useMemo(() => getAvailablePacks(), []);
  const imageOptions = useMemo(() => getMockImageCaptionOptions(targetLanguage), [targetLanguage]);

  const handleTranslateText = (e?: React.FormEvent) => {
    e?.preventDefault();
    const result = translateTextLocally(textInput, 'en', targetLanguage);
    setTextOutput(result.translatedText);
    setTextStatus(
      result.sourceText
        ? `Local mock translation (${result.matchedFrom}). Offline-only; no text sent externally.`
        : 'Enter source text to translate.',
    );
  };

  const handleVoice = async () => {
    setVoiceStatus('Requesting voice capture locally...');
    const capture = await captureVoiceInput();
    if (capture.status === 'captured' && capture.transcript) {
      setTextInput(capture.transcript);
      const translated = translateTextLocally(capture.transcript, 'en', targetLanguage);
      setTextOutput(translated.translatedText);
      setVoiceStatus(capture.message);
      setTextStatus(`Translated captured speech locally (${translated.matchedFrom}).`);
    } else {
      setVoiceStatus(capture.message);
    }
  };

  const handleImageTranslate = (e?: React.FormEvent) => {
    e?.preventDefault();
    const result = translateImageLocally(imageLabel, targetLanguage);
    setImageCaption(result.caption);
    setImageMessage(result.message);
  };

  const handleGenerateEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    const phrase = generateEmergencyPhrase({
      situation: emergencySituation,
      location: emergencyLocation,
      medicalNeed: emergencyMedical,
      targetLanguage,
    });
    setEmergencyResult(`${phrase.sourceText}\n\n${phrase.translatedText}`);
  };

  return (
    <div className="space-y-6" aria-label="Translation tool">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Translation & Language Assistance</h1>
            <p className="text-sm text-slate-400 mt-1">
              Local mock translation, bundled phrases, offline packs, and safe fallbacks for voice/camera. No text, audio, or images are sent to external services.
            </p>
          </div>
          <div>
            <label htmlFor="tl-target" className="block text-xs font-semibold text-slate-300 mb-1">Target language</label>
            <select
              id="tl-target"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
              className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4" aria-labelledby="text-translation-heading">
        <h2 id="text-translation-heading" className="text-lg font-semibold text-white">Text translation</h2>
        <form onSubmit={handleTranslateText} className="space-y-3">
          <label htmlFor="tl-text-input" className="block text-xs font-semibold text-slate-300">Source text (English)</label>
          <textarea
            id="tl-text-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Type text to translate..."
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium">Translate text</button>
          </div>
        </form>
        <div role="status" aria-live="polite" className="text-xs text-slate-400">{textStatus}</div>
        <div>
          <label htmlFor="tl-text-output" className="block text-xs font-semibold text-slate-300 mb-1">Translated output</label>
          <output id="tl-text-output" className="block min-h-[3rem] rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 whitespace-pre-wrap">
            {textOutput || '—'}
          </output>
        </div>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-3" aria-labelledby="voice-translation-heading">
        <h2 id="voice-translation-heading" className="text-lg font-semibold text-white">Voice translation (local fallback-safe)</h2>
        <p className="text-sm text-slate-400">{getVoiceSupportStatus().message}</p>
        <button type="button" onClick={handleVoice} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-medium">
          Capture voice to text
        </button>
        <div role="status" aria-live="polite" className="text-xs text-slate-300">{voiceStatus}</div>
        <p className="text-xs text-slate-500">If capture is unsupported or denied, use text input or bundled phrases. Audio is never uploaded.</p>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-3" aria-labelledby="camera-translation-heading">
        <h2 id="camera-translation-heading" className="text-lg font-semibold text-white">Camera/sign translation (mock local)</h2>
        <p className="text-sm text-slate-400">{cameraStatus}</p>
        <form onSubmit={handleImageTranslate} className="space-y-3">
          <label htmlFor="tl-image-label" className="block text-xs font-semibold text-slate-300">Bundled sample sign/image label</label>
          <input
            id="tl-image-label"
            list="tl-image-options"
            value={imageLabel}
            onChange={(e) => setImageLabel(e.target.value)}
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder={imageOptions[0]?.label || 'e.g. Exit sign'}
          />
          <datalist id="tl-image-options">
            {imageOptions.map((opt) => (
              <option key={opt.id} value={opt.label} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium">Translate image (mock)</button>
            <label className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium cursor-pointer">
              Choose image (local fallback)
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageLabel(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
                  setImageMessage('Selected image kept local. In privacy-safe mock mode, no OCR/upload occurs; use bundled sample labels for translated captions.');
                  setImageCaption('');
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </form>
        <div role="status" aria-live="polite" className="text-xs text-slate-300">{imageMessage}</div>
        {imageCaption && (
          <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100">
            <span className="font-semibold text-slate-300">Captioned text: </span>{imageCaption}
          </div>
        )}
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4" aria-labelledby="phrases-heading">
        <h2 id="phrases-heading" className="text-lg font-semibold text-white">Common local phrases & offline packs</h2>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Offline translation packs (bundled/local)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {packs.filter((p) => p.targetLanguage === targetLanguage).map((pack) => {
              const downloaded = savedState.downloadedPackIds.includes(pack.id);
              return (
                <div key={pack.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div>
                    <div className="text-sm text-white">{pack.label}</div>
                    <div className="text-xs text-slate-400">{downloaded ? 'Saved for offline use' : 'Available offline bundle'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedState(togglePackDownload(pack.id))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${downloaded ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}
                  >
                    {downloaded ? 'Saved' : 'Save pack'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Phrasebook</h3>
          <ul className="space-y-2">
            {phrases.map((phrase) => {
              const favorite = savedState.favoritePhraseIds.includes(phrase.id);
              return (
                <li key={phrase.id} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-white">{phrase.sourceText}</div>
                      <div className="text-sm text-sky-300">{phrase.translatedText}</div>
                      {phrase.phoneticPronunciation && <div className="text-xs text-slate-400 mt-0.5">{phrase.phoneticPronunciation}</div>}
                      <div className="text-[11px] text-slate-500 mt-1 capitalize">{phrase.category}{phrase.isEmergencyPhrase ? ' • emergency' : ''}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSavedState(toggleFavoritePhrase(phrase.id))}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-200"
                      aria-pressed={favorite}
                    >
                      {favorite ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-3" aria-labelledby="emergency-phrase-heading">
        <h2 id="emergency-phrase-heading" className="text-lg font-semibold text-white">Emergency phrase generator (local mock)</h2>
        <form onSubmit={handleGenerateEmergency} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="emg-situation" className="block text-xs font-semibold text-slate-300 mb-1">Situation</label>
            <input id="emg-situation" value={emergencySituation} onChange={(e) => setEmergencySituation(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label htmlFor="emg-location" className="block text-xs font-semibold text-slate-300 mb-1">Location (optional)</label>
            <input id="emg-location" value={emergencyLocation} onChange={(e) => setEmergencyLocation(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label htmlFor="emg-medical" className="block text-xs font-semibold text-slate-300 mb-1">Medical need (optional)</label>
            <input id="emg-medical" value={emergencyMedical} onChange={(e) => setEmergencyMedical(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium">Generate emergency phrase</button>
          </div>
        </form>
        {emergencyResult && (
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100" aria-live="polite">{emergencyResult}</pre>
        )}
      </section>
    </div>
  );
};

export default TranslationTool;
