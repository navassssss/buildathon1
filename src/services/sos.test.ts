import { beforeEach, describe, expect, it } from 'vitest';
import type { EmergencyProfile } from '../types';
import { db } from './db';
import {
  buildContactDrafts,
  buildSafeRouteSuggestions,
  clearSosLog,
  createEmptyProfile,
  createLocationShare,
  createLostReport,
  deleteEmergencyProfile,
  findNearbyEmergencyServices,
  formatLostReport,
  formatMedicalSummary,
  formatSosMessage,
  getEmergencyNumberOptions,
  getEmergencyNumbers,
  getSosLog,
  loadEmergencyProfile,
  parseListInput,
  saveEmergencyProfile,
  triggerLocalSos,
} from './sos';
import type { NearbyPlace } from '../types';

function makeProfile(overrides: Partial<EmergencyProfile> = {}): EmergencyProfile {
  return {
    id: 'profile-test',
    fullName: 'Alex Traveller',
    bloodType: 'O+',
    allergies: ['penicillin'],
    medications: [],
    medicalConditions: ['asthma'],
    emergencyContacts: [
      {
        id: 'contact-1',
        name: 'Sam Traveller',
        relationship: 'sister',
        phoneNumber: '+44 7700 900123',
        email: 'sam@example.com',
        notifyOnSOS: true,
      },
      {
        id: 'contact-2',
        name: 'Not Notified',
        relationship: 'friend',
        phoneNumber: '+44 7700 900999',
        notifyOnSOS: false,
      },
      {
        id: 'contact-3',
        name: 'No Details',
        relationship: 'friend',
        phoneNumber: '   ',
        notifyOnSOS: true,
      },
    ],
    updatedAt: '2026-11-11T10:00:00.000Z',
    ...overrides,
  };
}

const hospital: NearbyPlace = {
  id: 'place-1',
  name: 'St Thomas Hospital',
  category: 'hospital',
  address: 'Westminster Bridge Road, London',
  distanceMeters: 1200,
  coordinates: { lat: 51.4989, lng: -0.1181 },
  open24Hours: true,
};

const police: NearbyPlace = {
  id: 'place-2',
  name: 'Westminster Police Station',
  category: 'police',
  address: 'Buckingham Gate, London',
  distanceMeters: 400,
  coordinates: { lat: 51.4981, lng: -0.1356 },
  open24Hours: true,
};

const restaurant: NearbyPlace = {
  id: 'place-3',
  name: 'The Ivy',
  category: 'restaurant',
  address: 'West Street, London',
  distanceMeters: 100,
  coordinates: { lat: 51.5118, lng: -0.1283 },
  open24Hours: false,
};

describe('SOS service (T-005: F-SOS-001)', () => {
  beforeEach(async () => {
    await db.emergencyProfiles.clear();
    sessionStorage.clear();
    clearSosLog();
  });

  describe('emergency numbers', () => {
    it('returns bundled numbers for a country code, case-insensitively', () => {
      const uk = getEmergencyNumbers('gb');
      expect(uk?.countryName).toBe('United Kingdom');
      expect(uk?.police).toBe('999');
      expect(getEmergencyNumbers('IN')?.general).toBe('112');
    });

    it('returns null for unknown country codes', () => {
      expect(getEmergencyNumbers('ZZ')).toBeNull();
    });

    it('lists selectable countries', () => {
      const options = getEmergencyNumberOptions();
      expect(options.length).toBeGreaterThan(5);
      expect(options[0]).toHaveProperty('code');
      expect(options[0]).toHaveProperty('name');
    });
  });

  describe('location sharing payloads', () => {
    it('creates a share payload with rounded accuracy and flags', () => {
      const share = createLocationShare(
        { latitude: 51.5074, longitude: -0.1278, accuracy: 12.7 },
        { emergencyAlert: true, note: 'near the station', batteryLevel: 42 }
      );
      expect(share.latitude).toBeCloseTo(51.5074);
      expect(share.accuracy).toBe(13);
      expect(share.emergencyAlert).toBe(true);
      expect(share.batteryLevel).toBe(42);
      expect(share.note).toBe('near the station');
      expect(share.altitude).toBeNull();
    });

    it('formats a message with coordinates and an explicit not-sent notice', () => {
      const share = createLocationShare({ latitude: 1.2345, longitude: 6.789, accuracy: 8 });
      const message = formatSosMessage(makeProfile(), share, 'Please call me');
      expect(message).toContain('Alex Traveller');
      expect(message).toContain('1.23450, 6.78900');
      expect(message).toContain('Please call me');
      expect(message).toContain('has not been sent automatically');
    });

    it('explains missing location instead of inventing coordinates', () => {
      const message = formatSosMessage(makeProfile(), null);
      expect(message).toContain('Location: unavailable');
    });
  });

  describe('contact drafts', () => {
    it('only drafts for notify-on-SOS contacts with usable details', () => {
      const message = 'EMERGENCY — test';
      const drafts = buildContactDrafts(makeProfile().emergencyContacts, message);
      expect(drafts).toHaveLength(1);
      expect(drafts[0].contactName).toBe('Sam Traveller');
      expect(drafts[0].callLink).toBe('tel:+447700900123');
      expect(drafts[0].emailLink).toContain('mailto:sam@example.com');
      expect(drafts[0].message).toBe(message);
    });

    it('uses a tel link even when email is absent', () => {
      const profile = makeProfile({
        emergencyContacts: [
          {
            id: 'c',
            name: 'Phone Only',
            relationship: 'friend',
            phoneNumber: '(555) 010-2000',
            notifyOnSOS: true,
          },
        ],
      });
      const [draft] = buildContactDrafts(profile.emergencyContacts, 'msg');
      expect(draft.callLink).toBe('tel:5550102000');
      expect(draft.emailLink).toBeUndefined();
    });
  });

  describe('triggerLocalSos', () => {
    it('returns drafts, a share payload, and logs the event in session storage', () => {
      const result = triggerLocalSos({
        profile: makeProfile(),
        location: { latitude: 48.8566, longitude: 2.3522, accuracy: 15 },
        note: 'help',
      });

      expect(result.hasNotifiableContacts).toBe(true);
      expect(result.drafts).toHaveLength(1);
      expect(result.share?.latitude).toBeCloseTo(48.8566);
      expect(result.locationError).toBeNull();

      const log = getSosLog();
      expect(log).toHaveLength(1);
      expect(log[0].contactDraftCount).toBe(1);
      expect(log[0].latitude).toBeCloseTo(48.8566);
    });

    it('still produces a usable result when location is unavailable', () => {
      const result = triggerLocalSos({
        profile: makeProfile(),
        location: null,
        locationError: 'Location permission denied.',
      });
      expect(result.share).toBeNull();
      expect(result.locationError).toBe('Location permission denied.');
      expect(result.message).toContain('Location: unavailable');
      expect(result.drafts).toHaveLength(1);
    });

    it('reports when no contact can be notified', () => {
      const result = triggerLocalSos({ profile: null });
      expect(result.hasNotifiableContacts).toBe(false);
      expect(result.drafts).toHaveLength(0);
    });

    it('keeps only the most recent entries in the session log', () => {
      for (let index = 0; index < 25; index += 1) {
        triggerLocalSos({ profile: null, note: `entry-${index}` });
      }
      const log = getSosLog();
      expect(log).toHaveLength(20);
      expect(log[19].note).toBe('entry-24');
    });
  });

  describe('medical profile persistence', () => {
    it('saves, loads the latest, and deletes the local profile', async () => {
      const older = makeProfile({ id: 'old', updatedAt: '2026-11-01T00:00:00.000Z' });
      const newer = makeProfile({ id: 'new', fullName: 'Newer Name' });
      await db.emergencyProfiles.put(older);
      await saveEmergencyProfile(newer);

      const loaded = await loadEmergencyProfile();
      expect(loaded?.id).toBe('new');
      expect(loaded?.fullName).toBe('Newer Name');
      expect(loaded?.updatedAt).not.toBe('2026-11-11T10:00:00.000Z');

      await deleteEmergencyProfile('new');
      expect((await loadEmergencyProfile())?.id).toBe('old');
    });

    it('returns null when no profile is stored', async () => {
      expect(await loadEmergencyProfile()).toBeNull();
    });

    it('creates a blank profile with a stable shape', () => {
      const empty = createEmptyProfile();
      expect(empty.fullName).toBe('');
      expect(empty.emergencyContacts).toEqual([]);
      expect(empty.id).toContain('profile-');
    });

    it('formats an informational medical summary without advice', () => {
      const summary = formatMedicalSummary(makeProfile());
      expect(summary).toContain('Blood type: O+');
      expect(summary).toContain('Allergies: penicillin');
      expect(summary).not.toMatch(/you should|diagnos/i);
      expect(formatMedicalSummary(null)).toBe('No medical profile saved.');
    });

    it('parses comma and newline separated list input', () => {
      expect(parseListInput('a, b\nc ,, d ')).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('nearby help', () => {
    it('returns emergency-service fixtures sorted by distance', async () => {
      const places = await findNearbyEmergencyServices(51.5007, -0.1246);
      expect(places.length).toBeGreaterThan(0);
      expect(places.every((place) => ['hospital', 'police', 'pharmacy'].includes(place.category))).toBe(
        true
      );
      const distances = places.map((place) => place.distanceMeters);
      expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    });

    it('builds schematic route hints for the nearest hospital and police station only', () => {
      const suggestions = buildSafeRouteSuggestions([restaurant, hospital, police]);
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].place.id).toBe('place-2');
      expect(suggestions[0].distanceLabel).toBe('0.4 km');
      expect(suggestions[0].guidance).toMatch(/police station/i);
      expect(suggestions[1].guidance).toMatch(/hospital/i);
    });

    it('returns no hints for unrelated categories', () => {
      expect(buildSafeRouteSuggestions([restaurant])).toEqual([]);
    });
  });

  describe('lost reports', () => {
    it('creates a local-only report and formats it for copying', () => {
      const report = createLostReport({
        type: 'person',
        name: 'Jamie',
        description: 'Blue jacket, last seen near the market',
        lastSeenLocation: 'Central Market',
        contactNumber: '+44 7700 900000',
      });
      expect(report.localOnly).toBe(true);
      const text = formatLostReport(report);
      expect(text).toContain('Missing person: Jamie');
      expect(text).toContain('Last seen: Central Market');
      expect(text).toContain('Prepared on-device');
    });
  });
});
