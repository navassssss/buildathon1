/**
 * SOS + Location Sharing service (T-005 / F-SOS-001).
 *
 * Local-only by design:
 * - no real emergency dispatch and no external API calls;
 * - nothing is transmitted; "notifications" are local drafts the user can act
 *   on with their own phone/email apps;
 * - medical information is informational only and is never shared automatically;
 * - location is only read from an explicit, user-initiated foreground request.
 */

import type {
  EmergencyContact,
  EmergencyProfile,
  LocationSharePayload,
  NearbyPlace,
} from '../types';
import { db } from './db';
import { findEmergencyServices } from './nearbyPlaces';

/** Country-specific public emergency numbers (bundled reference data). */
export interface EmergencyNumbers {
  countryCode: string;
  countryName: string;
  police: string;
  ambulance: string;
  fire: string;
  /** Unified / general emergency number when one exists. */
  general?: string;
  notes?: string;
}

export const EMERGENCY_NUMBERS: EmergencyNumbers[] = [
  {
    countryCode: 'IN',
    countryName: 'India',
    police: '100',
    ambulance: '102',
    fire: '101',
    general: '112',
    notes: '112 is the unified emergency response number.',
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    police: '999',
    ambulance: '999',
    fire: '999',
    general: '112',
    notes: '999 and 112 reach the same emergency services.',
  },
  {
    countryCode: 'US',
    countryName: 'United States',
    police: '911',
    ambulance: '911',
    fire: '911',
    general: '911',
  },
  {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    police: '999',
    ambulance: '998',
    fire: '997',
    general: '999',
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    police: '17',
    ambulance: '15',
    fire: '18',
    general: '112',
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    police: '110',
    ambulance: '112',
    fire: '112',
    general: '112',
  },
  {
    countryCode: 'JP',
    countryName: 'Japan',
    police: '110',
    ambulance: '119',
    fire: '119',
    notes: 'English assistance may not be available.',
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    police: '000',
    ambulance: '000',
    fire: '000',
    general: '112',
    notes: '112 works from mobile phones.',
  },
  {
    countryCode: 'TH',
    countryName: 'Thailand',
    police: '191',
    ambulance: '1669',
    fire: '199',
    general: '191',
  },
  {
    countryCode: 'SG',
    countryName: 'Singapore',
    police: '999',
    ambulance: '995',
    fire: '995',
  },
];

/** Emergency numbers for a country code, case-insensitive. */
export function getEmergencyNumbers(countryCode: string): EmergencyNumbers | null {
  const code = countryCode.trim().toUpperCase();
  return EMERGENCY_NUMBERS.find((entry) => entry.countryCode === code) ?? null;
}

/** List of selectable countries for the emergency numbers panel. */
export function getEmergencyNumberOptions(): Array<{ code: string; name: string }> {
  return EMERGENCY_NUMBERS.map(({ countryCode, countryName }) => ({
    code: countryCode,
    name: countryName,
  }));
}

/** Local draft notification for a trusted contact. Nothing is sent. */
export interface SosContactDraft {
  contactId: string;
  contactName: string;
  phoneNumber: string;
  email?: string;
  /** `tel:` link the user can tap to call themselves. */
  callLink: string;
  /** `mailto:` link with the SOS message pre-filled, when an email exists. */
  emailLink?: string;
  message: string;
}

/** Result of a locally triggered SOS. */
export interface SosTriggerResult {
  id: string;
  triggeredAt: string;
  message: string;
  share: LocationSharePayload | null;
  drafts: SosContactDraft[];
  /** False when every notify-on-SOS contact was missing usable contact details. */
  hasNotifiableContacts: boolean;
  locationError: string | null;
}

/** One entry of the in-session SOS log. */
export interface SosLogEntry {
  id: string;
  triggeredAt: string;
  latitude: number | null;
  longitude: number | null;
  contactDraftCount: number;
  note?: string;
}

export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
}

const SOS_LOG_KEY = 'traveller:sos-session-log';
const MAX_LOG_ENTRIES = 20;

/** Generate an id without relying on an external uuid dependency. */
export function createSosId(prefix = 'sos'): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

/** Build a location share payload from a foreground location fix. */
export function createLocationShare(
  fix: LocationFix,
  options: { emergencyAlert?: boolean; note?: string; batteryLevel?: number } = {}
): LocationSharePayload {
  return {
    id: createSosId('share'),
    timestamp: new Date().toISOString(),
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy: Math.round(fix.accuracy),
    altitude: fix.altitude ?? null,
    speed: fix.speed ?? null,
    batteryLevel: options.batteryLevel,
    emergencyAlert: options.emergencyAlert ?? true,
    note: options.note,
  };
}

/** Human-readable SOS message that the user can copy or paste themselves. */
export function formatSosMessage(
  profile: EmergencyProfile | null,
  share: LocationSharePayload | null,
  note?: string
): string {
  const lines: string[] = [];
  lines.push('EMERGENCY — I need help.');
  if (profile?.fullName) {
    lines.push(`Name: ${profile.fullName}`);
  }
  if (share) {
    lines.push(
      `Location: ${share.latitude.toFixed(5)}, ${share.longitude.toFixed(5)} (±${share.accuracy} m)`
    );
    lines.push(`Shared at: ${new Date(share.timestamp).toLocaleString()}`);
    if (share.batteryLevel !== undefined) {
      lines.push(`Phone battery: ${share.batteryLevel}%`);
    }
  } else {
    lines.push('Location: unavailable (location permission not granted)');
  }
  if (note?.trim()) {
    lines.push(`Note: ${note.trim()}`);
  }
  lines.push('This message was prepared on-device. It has not been sent automatically.');
  return lines.join('\n');
}

/** Build per-contact local drafts. Contacts without phone/email are skipped. */
export function buildContactDrafts(
  contacts: EmergencyContact[],
  message: string
): SosContactDraft[] {
  return contacts
    .filter((contact) => contact.notifyOnSOS)
    .filter((contact) => Boolean(contact.phoneNumber?.trim() || contact.email?.trim()))
    .map((contact) => {
      const phone = contact.phoneNumber?.trim() ?? '';
      const email = contact.email?.trim();
      return {
        contactId: contact.id,
        contactName: contact.name,
        phoneNumber: phone,
        ...(email ? { email } : {}),
        callLink: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '',
        ...(email
          ? {
              emailLink: `mailto:${email}?subject=${encodeURIComponent(
                'Emergency — I need help'
              )}&body=${encodeURIComponent(message)}`,
            }
          : {}),
        message,
      };
    });
}

/**
 * Trigger SOS locally: prepare a location share payload (when a fix is
 * available) and per-contact drafts. No dispatch, no network transmission.
 */
export function triggerLocalSos(input: {
  profile: EmergencyProfile | null;
  location?: LocationFix | null;
  locationError?: string | null;
  note?: string;
  batteryLevel?: number;
}): SosTriggerResult {
  const share = input.location
    ? createLocationShare(input.location, {
        emergencyAlert: true,
        note: input.note,
        batteryLevel: input.batteryLevel,
      })
    : null;
  const message = formatSosMessage(input.profile, share, input.note);
  const drafts = buildContactDrafts(input.profile?.emergencyContacts ?? [], message);
  const result: SosTriggerResult = {
    id: createSosId('sos'),
    triggeredAt: new Date().toISOString(),
    message,
    share,
    drafts,
    hasNotifiableContacts: drafts.length > 0,
    locationError: input.locationError ?? null,
  };
  logSosEntry({
    id: result.id,
    triggeredAt: result.triggeredAt,
    latitude: share?.latitude ?? null,
    longitude: share?.longitude ?? null,
    contactDraftCount: drafts.length,
    note: input.note,
  });
  return result;
}

function readSessionLog(): SosLogEntry[] {
  if (typeof window === 'undefined' || !window.sessionStorage) return [];
  try {
    const raw = window.sessionStorage.getItem(SOS_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SosLogEntry[]) : [];
  } catch {
    return [];
  }
}

/** Append an SOS event to the in-session log (cleared when the tab closes). */
export function logSosEntry(entry: SosLogEntry): SosLogEntry[] {
  const log = [...readSessionLog(), entry].slice(-MAX_LOG_ENTRIES);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SOS_LOG_KEY, JSON.stringify(log));
    } catch {
      // Session storage may be unavailable (private mode/quota); the log is
      // best-effort and the SOS result is still returned to the caller.
    }
  }
  return log;
}

/** Read the in-session SOS log (never persisted beyond the browser session). */
export function getSosLog(): SosLogEntry[] {
  return readSessionLog();
}

/** Clear the in-session SOS log. */
export function clearSosLog(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(SOS_LOG_KEY);
  } catch {
    // ignore
  }
}

/** A blank emergency profile for first-time users. */
export function createEmptyProfile(): EmergencyProfile {
  return {
    id: createSosId('profile'),
    fullName: '',
    bloodType: '',
    allergies: [],
    medications: [],
    medicalConditions: [],
    emergencyContacts: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Persist the medical profile / contacts locally in IndexedDB. */
export async function saveEmergencyProfile(
  profile: EmergencyProfile
): Promise<EmergencyProfile> {
  const record: EmergencyProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  await db.emergencyProfiles.put(record);
  return record;
}

/** Load the most recently updated local profile, if any. */
export async function loadEmergencyProfile(): Promise<EmergencyProfile | null> {
  const profiles = await db.emergencyProfiles.toArray();
  if (profiles.length === 0) return null;
  return profiles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/** Delete a stored profile by id. */
export async function deleteEmergencyProfile(id: string): Promise<void> {
  await db.emergencyProfiles.delete(id);
}

/** Informational summary of the medical profile. Never presented as advice. */
export function formatMedicalSummary(profile: EmergencyProfile | null): string {
  if (!profile) return 'No medical profile saved.';
  const parts: string[] = [];
  if (profile.bloodType) parts.push(`Blood type: ${profile.bloodType}`);
  if (profile.allergies.length) parts.push(`Allergies: ${profile.allergies.join(', ')}`);
  if (profile.medications.length) parts.push(`Medications: ${profile.medications.join(', ')}`);
  if (profile.medicalConditions.length) {
    parts.push(`Conditions: ${profile.medicalConditions.join(', ')}`);
  }
  if (profile.insuranceProvider) {
    parts.push(
      `Insurance: ${profile.insuranceProvider}${
        profile.insurancePolicyNumber ? ` (${profile.insurancePolicyNumber})` : ''
      }`
    );
  }
  if (profile.specialInstructions) {
    parts.push(`Notes: ${profile.specialInstructions}`);
  }
  return parts.length > 0 ? parts.join('\n') : 'No medical details recorded.';
}

/** Split a comma/newline separated input into a clean string list. */
export function parseListInput(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** A schematic "safe route" hint derived from bundled POI fixtures. */
export interface SafeRouteSuggestion {
  place: NearbyPlace;
  distanceLabel: string;
  guidance: string;
}

/**
 * Suggest the nearest emergency destinations. These are schematic hints from
 * local fixtures, not turn-by-turn navigation.
 */
export function buildSafeRouteSuggestions(places: NearbyPlace[]): SafeRouteSuggestion[] {
  const preferred = places
    .filter((place) => place.category === 'hospital' || place.category === 'police')
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 4);

  return preferred.map((place) => ({
    place,
    distanceLabel: `${(place.distanceMeters / 1000).toFixed(1)} km`,
    guidance:
      place.category === 'hospital'
        ? 'Head to the nearest hospital emergency department; call ahead if possible.'
        : 'Report the incident at the nearest police station; call first if you are in danger.',
  }));
}

/** Local emergency services near a foreground location fix. */
export async function findNearbyEmergencyServices(
  latitude: number,
  longitude: number
): Promise<NearbyPlace[]> {
  return findEmergencyServices(latitude, longitude);
}

export type LostReportType = 'person' | 'item';

export interface LostReport {
  id: string;
  type: LostReportType;
  name: string;
  description: string;
  lastSeenLocation: string;
  contactNumber: string;
  createdAt: string;
  /** True because this report exists only on this device. */
  localOnly: true;
}

export function createLostReport(input: {
  type: LostReportType;
  name: string;
  description: string;
  lastSeenLocation?: string;
  contactNumber?: string;
}): LostReport {
  return {
    id: createSosId('lost'),
    type: input.type,
    name: input.name.trim(),
    description: input.description.trim(),
    lastSeenLocation: input.lastSeenLocation?.trim() ?? '',
    contactNumber: input.contactNumber?.trim() ?? '',
    createdAt: new Date().toISOString(),
    localOnly: true,
  };
}

/** Copy-ready lost person/item report text. */
export function formatLostReport(report: LostReport): string {
  const label = report.type === 'person' ? 'Missing person' : 'Lost item';
  const lines = [`${label}: ${report.name}`];
  if (report.description) lines.push(`Details: ${report.description}`);
  if (report.lastSeenLocation) lines.push(`Last seen: ${report.lastSeenLocation}`);
  if (report.contactNumber) lines.push(`Contact: ${report.contactNumber}`);
  lines.push('Prepared on-device. Share only with people or authorities you trust.');
  return lines.join('\n');
}
