import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  Crosshair,
  HeartPulse,
  Hospital,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import type { EmergencyContact, EmergencyProfile, NearbyPlace } from '../../types';
import {
  checkLocationPermission,
  formatDistance,
  getCurrentLocation,
} from '../../services/location';
import {
  buildSafeRouteSuggestions,
  createEmptyProfile,
  createLostReport,
  deleteEmergencyProfile,
  findNearbyEmergencyServices,
  formatLostReport,
  formatMedicalSummary,
  getEmergencyNumberOptions,
  getEmergencyNumbers,
  loadEmergencyProfile,
  parseListInput,
  saveEmergencyProfile,
  triggerLocalSos,
  type LostReport,
  type LostReportType,
  type SafeRouteSuggestion,
  type SosTriggerResult,
} from '../../services/sos';

type Tab = 'emergency' | 'medical' | 'nearby' | 'lost';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'emergency', label: 'Emergency SOS' },
  { id: 'medical', label: 'Medical Profile' },
  { id: 'nearby', label: 'Nearby Help' },
  { id: 'lost', label: 'Lost & Found' },
];

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500';

const buttonPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20 disabled:opacity-50';

export const SosPanel: React.FC = () => {
  const [tab, setTab] = useState<Tab>('emergency');
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [countryCode, setCountryCode] = useState('IN');
  const [note, setNote] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [sosResult, setSosResult] = useState<SosTriggerResult | null>(null);
  const [locationState, setLocationState] = useState<
    'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [form, setForm] = useState(() => createEmptyProfile());
  const [allergiesText, setAllergiesText] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [contactDraft, setContactDraft] = useState({
    name: '',
    relationship: '',
    phoneNumber: '',
    email: '',
    notifyOnSOS: true,
  });

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [lostType, setLostType] = useState<LostReportType>('item');
  const [lostDraft, setLostDraft] = useState({
    name: '',
    description: '',
    lastSeenLocation: '',
    contactNumber: '',
  });
  const [lostReport, setLostReport] = useState<LostReport | null>(null);

  const emergencyNumbers = useMemo(() => getEmergencyNumbers(countryCode), [countryCode]);
  const countryOptions = useMemo(() => getEmergencyNumberOptions(), []);
  const safeRoutes = useMemo<SafeRouteSuggestion[]>(
    () => buildSafeRouteSuggestions(nearbyPlaces),
    [nearbyPlaces]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadEmergencyProfile();
        if (cancelled) return;
        if (stored) {
          setProfile(stored);
          setForm(stored);
          setAllergiesText(stored.allergies.join(', '));
          setMedicationsText(stored.medications.join(', '));
          setConditionsText(stored.medicalConditions.join(', '));
        }
      } catch {
        if (!cancelled) setError('Could not read the local medical profile.');
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy is unavailable in this browser. Select the text and copy it manually.');
    }
  };

  const handleTriggerSos = async () => {
    setError(null);
    setIsTriggering(true);
    setLocationState('requesting');
    let location = null;
    let locationError: string | null = null;

    try {
      const fix = await getCurrentLocation();
      location = fix;
      setLocationState('granted');
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === 'PERMISSION_DENIED') {
        locationError = 'Location permission denied. The SOS message will not include coordinates.';
        setLocationState('denied');
      } else if (code === 'NOT_SUPPORTED') {
        locationError = 'Geolocation is not supported in this browser.';
        setLocationState('unavailable');
      } else {
        locationError = 'Location unavailable. The SOS message will not include coordinates.';
        setLocationState('unavailable');
      }
    }

    try {
      const result = triggerLocalSos({
        profile,
        location,
        locationError,
        note,
      });
      setSosResult(result);
    } catch {
      setError('Could not prepare the SOS message. Please try again.');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleStopSharing = () => {
    setSosResult(null);
    setNote('');
    setLocationState('idle');
  };

  const handleRequestLocationPermission = async () => {
    const state = await checkLocationPermission();
    if (state === 'denied') {
      setError('Location access is blocked. Enable it in browser settings to share coordinates.');
    } else {
      setError(null);
    }
  };

  const handleSaveProfile = async () => {
    setSaveState('saving');
    setError(null);
    try {
      const record: EmergencyProfile = {
        ...form,
        allergies: parseListInput(allergiesText),
        medications: parseListInput(medicationsText),
        medicalConditions: parseListInput(conditionsText),
      };
      const saved = await saveEmergencyProfile(record);
      setProfile(saved);
      setForm(saved);
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('idle');
      setError('Could not save the medical profile on this device.');
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;
    try {
      await deleteEmergencyProfile(profile.id);
      const empty = createEmptyProfile();
      setProfile(null);
      setForm(empty);
      setAllergiesText('');
      setMedicationsText('');
      setConditionsText('');
      setSaveState('idle');
    } catch {
      setError('Could not delete the medical profile.');
    }
  };

  const handleAddContact = () => {
    if (!contactDraft.name.trim() || !contactDraft.phoneNumber.trim()) return;
    const contact: EmergencyContact = {
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: contactDraft.name.trim(),
      relationship: contactDraft.relationship.trim() || 'Contact',
      phoneNumber: contactDraft.phoneNumber.trim(),
      ...(contactDraft.email.trim() ? { email: contactDraft.email.trim() } : {}),
      notifyOnSOS: contactDraft.notifyOnSOS,
    };
    setForm((current) => ({
      ...current,
      emergencyContacts: [...current.emergencyContacts, contact],
    }));
    setContactDraft({ name: '', relationship: '', phoneNumber: '', email: '', notifyOnSOS: true });
  };

  const handleRemoveContact = (id: string) => {
    setForm((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.filter((contact) => contact.id !== id),
    }));
  };

  const handleFindNearby = async () => {
    setIsLoadingNearby(true);
    setNearbyError(null);
    try {
      const fix = await getCurrentLocation();
      const places = await findNearbyEmergencyServices(fix.latitude, fix.longitude);
      setNearbyPlaces(places);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setNearbyError(
        code === 'PERMISSION_DENIED'
          ? 'Location permission denied. Enable location access to see nearby hospitals and police stations.'
          : 'Could not load nearby emergency services. Try again when you have a location fix.'
      );
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const handleCreateLostReport = () => {
    if (!lostDraft.name.trim() || !lostDraft.description.trim()) return;
    setLostReport(createLostReport({ type: lostType, ...lostDraft }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-400" /> SOS &amp; Location Sharing
        </h1>
        <p className="text-sm text-slate-400">
          Emergency assistance that stays on your device. Nothing is sent automatically and no
          real dispatch is contacted.
        </p>
      </div>

      <div
        role="note"
        className="p-3 rounded-xl border border-amber-700/60 bg-amber-950/40 text-amber-200 text-xs flex items-start gap-2"
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          This is a local information tool, not an emergency service. In a real emergency call your
          local emergency number directly. Medical details are for reference only, not medical
          advice.
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl border border-red-800 bg-red-950/70 text-red-200 text-sm flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="SOS sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              tab === item.id
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'emergency' && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-rose-900/60 bg-rose-950/20 p-5 space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              <button
                onClick={handleTriggerSos}
                disabled={isTriggering}
                aria-label="Trigger emergency SOS"
                className="w-40 h-40 rounded-full bg-gradient-to-br from-rose-500 to-red-700 hover:from-rose-400 hover:to-red-600 text-white font-black text-xl tracking-wide shadow-2xl shadow-rose-900/50 border-4 border-rose-300/30 transition disabled:opacity-60 flex flex-col items-center justify-center gap-2"
              >
                {isTriggering ? (
                  <Loader2 className="w-10 h-10 animate-spin" />
                ) : (
                  <ShieldAlert className="w-10 h-10" />
                )}
                <span>{isTriggering ? 'Preparing…' : 'SOS'}</span>
              </button>
              <p className="text-xs text-slate-400 max-w-sm">
                Prepares an emergency message with your location (if allowed) and drafts a message
                for each trusted contact. You choose whether to call or send it.
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-300">Optional note for contacts</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="e.g. I am near the central station and need help"
                className={`mt-1 ${inputClass}`}
              />
            </label>

            {locationState === 'denied' && (
              <div className="p-3 rounded-xl border border-amber-800 bg-amber-950/40 text-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p>Location permission is blocked, so coordinates will not be included.</p>
                  <button
                    type="button"
                    onClick={handleRequestLocationPermission}
                    className="underline underline-offset-2 hover:text-amber-100"
                  >
                    Check permission again
                  </button>
                </div>
              </div>
            )}

            {locationState === 'unavailable' && (
              <p className="text-xs text-amber-300" role="status">
                Location is unavailable. You can still use the message and emergency numbers below.
              </p>
            )}
          </section>

          {sosResult && (
            <section
              aria-live="polite"
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Emergency message prepared
                </h2>
                <span className="text-[11px] text-slate-400">
                  {new Date(sosResult.triggeredAt).toLocaleTimeString()}
                </span>
              </div>

              {sosResult.share ? (
                <div className="flex items-start gap-2 text-xs text-emerald-300">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Sharing location {sosResult.share.latitude.toFixed(5)},{' '}
                    {sosResult.share.longitude.toFixed(5)} (±{sosResult.share.accuracy} m) while this
                    panel stays open.
                  </span>
                </div>
              ) : (
                <p className="text-xs text-amber-300">{sosResult.locationError}</p>
              )}

              <pre className="whitespace-pre-wrap break-words text-xs text-slate-300 bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                {sosResult.message}
              </pre>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyText(sosResult.message)}
                  className={buttonPrimary}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy message'}
                </button>
                <button
                  type="button"
                  onClick={handleStopSharing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
                >
                  Stop sharing
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Trusted contacts
                </h3>
                {sosResult.hasNotifiableContacts ? (
                  <ul className="space-y-2">
                    {sosResult.drafts.map((draft) => (
                      <li
                        key={draft.contactId}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white">
                            {draft.contactName}
                          </span>
                          <span className="text-[11px] text-slate-400">Draft only</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {draft.callLink && (
                            <a
                              href={draft.callLink}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-700/50 text-emerald-200 hover:bg-emerald-600/30"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call {draft.phoneNumber}
                            </a>
                          )}
                          {draft.emailLink && (
                            <a
                              href={draft.emailLink}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600/20 border border-sky-700/50 text-sky-200 hover:bg-sky-600/30"
                            >
                              Email draft
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">
                    No contacts are set to be notified. Add trusted contacts in the Medical Profile
                    tab to prepare drafts. You can still call emergency services below.
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Country emergency numbers</h2>
                <p className="text-xs text-slate-400">Bundled reference list, dialled by your phone app.</p>
              </div>
              <label className="text-xs text-slate-300">
                <span className="sr-only">Country</span>
                <select
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {countryOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {emergencyNumbers ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Police', value: emergencyNumbers.police },
                  { label: 'Ambulance', value: emergencyNumbers.ambulance },
                  { label: 'Fire', value: emergencyNumbers.fire },
                  { label: 'General', value: emergencyNumbers.general ?? emergencyNumbers.police },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={`tel:${item.value}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 hover:border-rose-700 hover:bg-rose-950/30 transition"
                  >
                    <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                      {item.label}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-white">
                      <Phone className="w-3.5 h-3.5 text-rose-400" /> {item.value}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No bundled numbers for this country. Look up the local emergency number and save it
                in your contacts.
              </p>
            )}
            {emergencyNumbers?.notes && (
              <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {emergencyNumbers.notes}
              </p>
            )}
          </section>
        </div>
      )}

      {tab === 'medical' && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-400" /> Medical profile
              </h2>
              {isLoadingProfile && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Stored only in this browser. Informational use only — not medical advice. Details are
              never sent with the SOS message automatically.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-300">
                Full name
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  placeholder="Your name"
                />
              </label>
              <label className="text-xs text-slate-300">
                Blood type
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.bloodType}
                  onChange={(event) => setForm({ ...form, bloodType: event.target.value })}
                  placeholder="e.g. O+"
                />
              </label>
              <label className="text-xs text-slate-300">
                Allergies (comma separated)
                <input
                  className={`mt-1 ${inputClass}`}
                  value={allergiesText}
                  onChange={(event) => setAllergiesText(event.target.value)}
                  placeholder="e.g. penicillin, peanuts"
                />
              </label>
              <label className="text-xs text-slate-300">
                Medications (comma separated)
                <input
                  className={`mt-1 ${inputClass}`}
                  value={medicationsText}
                  onChange={(event) => setMedicationsText(event.target.value)}
                  placeholder="e.g. insulin"
                />
              </label>
              <label className="text-xs text-slate-300 sm:col-span-2">
                Medical conditions (comma separated)
                <input
                  className={`mt-1 ${inputClass}`}
                  value={conditionsText}
                  onChange={(event) => setConditionsText(event.target.value)}
                  placeholder="e.g. asthma, diabetes"
                />
              </label>
              <label className="text-xs text-slate-300">
                Insurance provider
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.insuranceProvider ?? ''}
                  onChange={(event) => setForm({ ...form, insuranceProvider: event.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label className="text-xs text-slate-300">
                Policy number
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.insurancePolicyNumber ?? ''}
                  onChange={(event) =>
                    setForm({ ...form, insurancePolicyNumber: event.target.value })
                  }
                  placeholder="Optional"
                />
              </label>
              <label className="text-xs text-slate-300 sm:col-span-2">
                Special instructions
                <textarea
                  className={`mt-1 ${inputClass}`}
                  rows={2}
                  value={form.specialInstructions ?? ''}
                  onChange={(event) =>
                    setForm({ ...form, specialInstructions: event.target.value })
                  }
                  placeholder="Optional information for responders or family"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleSaveProfile} className={buttonPrimary}>
                {saveState === 'saving' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saveState === 'saved' ? 'Saved on this device' : 'Save profile'}
              </button>
              {profile && (
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/60 text-slate-200 text-sm font-medium transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete profile
                </button>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> Trusted contacts
            </h2>

            {form.emergencyContacts.length > 0 ? (
              <ul className="space-y-2">
                {form.emergencyContacts.map((contact) => (
                  <li
                    key={contact.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {contact.name}{' '}
                        <span className="text-[11px] font-normal text-slate-400">
                          · {contact.relationship}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {contact.phoneNumber}
                        {contact.email ? ` · ${contact.email}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {contact.notifyOnSOS ? 'Included in SOS drafts' : 'Not notified on SOS'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(contact.id)}
                      aria-label={`Remove ${contact.name}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-950/40 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No trusted contacts yet. Add at least one person to prepare an SOS draft.
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <label className="text-xs text-slate-300">
                Name
                <input
                  className={`mt-1 ${inputClass}`}
                  value={contactDraft.name}
                  onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })}
                  placeholder="Contact name"
                />
              </label>
              <label className="text-xs text-slate-300">
                Relationship
                <input
                  className={`mt-1 ${inputClass}`}
                  value={contactDraft.relationship}
                  onChange={(event) =>
                    setContactDraft({ ...contactDraft, relationship: event.target.value })
                  }
                  placeholder="e.g. sister"
                />
              </label>
              <label className="text-xs text-slate-300">
                Phone number
                <input
                  className={`mt-1 ${inputClass}`}
                  value={contactDraft.phoneNumber}
                  onChange={(event) =>
                    setContactDraft({ ...contactDraft, phoneNumber: event.target.value })
                  }
                  placeholder="+44 7700 900123"
                />
              </label>
              <label className="text-xs text-slate-300">
                Email (optional)
                <input
                  className={`mt-1 ${inputClass}`}
                  value={contactDraft.email}
                  onChange={(event) =>
                    setContactDraft({ ...contactDraft, email: event.target.value })
                  }
                  placeholder="name@example.com"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={contactDraft.notifyOnSOS}
                  onChange={(event) =>
                    setContactDraft({ ...contactDraft, notifyOnSOS: event.target.checked })
                  }
                  className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                />
                Include this contact in SOS drafts
              </label>
            </div>

            <button
              type="button"
              onClick={handleAddContact}
              disabled={!contactDraft.name.trim() || !contactDraft.phoneNumber.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add contact
            </button>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="text-sm font-bold text-white mb-2">Profile summary</h2>
            <pre className="whitespace-pre-wrap text-xs text-slate-300">
              {formatMedicalSummary({ ...form, allergies: parseListInput(allergiesText), medications: parseListInput(medicationsText), medicalConditions: parseListInput(conditionsText) })}
            </pre>
          </section>
        </div>
      )}

      {tab === 'nearby' && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-sky-400" /> Emergency services nearby
                </h2>
                <p className="text-xs text-slate-400">
                  Uses bundled local fixtures — no map tiles or third-party requests.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFindNearby}
                disabled={isLoadingNearby}
                className={buttonPrimary}
              >
                {isLoadingNearby ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {nearbyPlaces.length > 0 ? 'Refresh nearby help' : 'Find nearby help'}
              </button>
            </div>

            {nearbyError && (
              <p role="alert" className="text-xs text-amber-300 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {nearbyError}
              </p>
            )}

            {nearbyPlaces.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center">
                <Crosshair className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-300">No services loaded yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Allow a one-time foreground location check to list the closest hospitals, police
                  stations and pharmacies from the offline fixture set.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {nearbyPlaces.map((place) => (
                  <li
                    key={place.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{place.name}</p>
                      <p className="text-xs text-slate-400">{place.address}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {formatDistance(place.distanceMeters)}
                        {place.open24Hours ? ' · Open 24h' : ''}
                      </p>
                    </div>
                    {place.phoneNumber && (
                      <a
                        href={`tel:${place.phoneNumber.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-700/50 text-emerald-200 text-xs hover:bg-emerald-600/30 whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Safe route hints
            </h2>
            <p className="text-xs text-slate-400">
              Schematic guidance based on the closest hospital or police station. This is not
              turn-by-turn navigation.
            </p>
            {safeRoutes.length === 0 ? (
              <p className="text-xs text-slate-500">Load nearby help first to see route hints.</p>
            ) : (
              <ul className="space-y-2">
                {safeRoutes.map((route) => (
                  <li
                    key={route.place.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                  >
                    <p className="text-sm font-medium text-white">
                      {route.place.name}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        · {route.distanceLabel}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{route.guidance}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'lost' && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Lost person or item report</h2>
            <p className="text-xs text-slate-400">
              Build a copy-ready report. It stays on this device until you choose to share it.
            </p>

            <div className="flex gap-2">
              {(
                [
                  { id: 'person' as LostReportType, label: 'Missing person' },
                  { id: 'item' as LostReportType, label: 'Lost item' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLostType(option.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    lostType === option.id
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="text-xs text-slate-300 block">
              {lostType === 'person' ? 'Person name' : 'Item name'}
              <input
                className={`mt-1 ${inputClass}`}
                value={lostDraft.name}
                onChange={(event) => setLostDraft({ ...lostDraft, name: event.target.value })}
              />
            </label>
            <label className="text-xs text-slate-300 block">
              Description
              <textarea
                className={`mt-1 ${inputClass}`}
                rows={2}
                value={lostDraft.description}
                onChange={(event) =>
                  setLostDraft({ ...lostDraft, description: event.target.value })
                }
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-300">
                Last seen location
                <input
                  className={`mt-1 ${inputClass}`}
                  value={lostDraft.lastSeenLocation}
                  onChange={(event) =>
                    setLostDraft({ ...lostDraft, lastSeenLocation: event.target.value })
                  }
                />
              </label>
              <label className="text-xs text-slate-300">
                Contact number
                <input
                  className={`mt-1 ${inputClass}`}
                  value={lostDraft.contactNumber}
                  onChange={(event) =>
                    setLostDraft({ ...lostDraft, contactNumber: event.target.value })
                  }
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleCreateLostReport}
              disabled={!lostDraft.name.trim() || !lostDraft.description.trim()}
              className={buttonPrimary}
            >
              <Plus className="w-4 h-4" /> Create report
            </button>
          </section>

          {lostReport && (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">Report ready</h2>
                <span className="text-[11px] text-slate-400">Local only</span>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-slate-300 bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                {formatLostReport(lostReport)}
              </pre>
              <button
                type="button"
                onClick={() => copyText(formatLostReport(lostReport))}
                className={buttonPrimary}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy report'}
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SosPanel;
