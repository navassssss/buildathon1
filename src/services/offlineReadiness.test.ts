import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmergencyProfile, NearbyPlace } from '../types';
import { db } from './db';
import {
  EXPECTED_CACHE_PREFIX,
  WORKBOX_CACHE_PREFIX,
  buildOfflineSnapshot,
  formatBytes,
  getCacheSummary,
  getOfflineReadiness,
  getSavedEssentials,
  getServiceWorkerStatus,
  getStorageEstimate,
  isAppShellCacheName,
  registerServiceWorker,
  subscribeToConnectivity,
  unregisterServiceWorker,
  type SavedEssentials,
  type ServiceWorkerStatus,
} from './offlineReadiness';

const swStatus = (overrides: Partial<ServiceWorkerStatus> = {}): ServiceWorkerStatus => ({
  supported: true,
  state: 'registered',
  controlling: true,
  scriptUrl: '/sw.js',
  ...overrides,
});

const emptySaved = (overrides: Partial<SavedEssentials> = {}): SavedEssentials => ({
  trips: 0,
  activities: 0,
  checklists: 0,
  documents: 0,
  expenses: 0,
  emergencyProfiles: 0,
  nearbyPlaces: 0,
  translationPhrases: 0,
  totalRecords: 0,
  ...overrides,
});

const profile: EmergencyProfile = {
  id: 'p1',
  fullName: 'Alex',
  bloodType: 'O+',
  allergies: [],
  medications: [],
  medicalConditions: [],
  emergencyContacts: [],
  updatedAt: '2026-11-11T10:00:00.000Z',
};

const place: NearbyPlace = {
  id: 'place-1',
  name: 'St Thomas Hospital',
  category: 'hospital',
  address: 'London',
  distanceMeters: 100,
  coordinates: { lat: 51.5, lng: -0.12 },
  open24Hours: true,
};

describe('offline readiness service (T-009: F-OFF-001)', () => {
  beforeEach(async () => {
    await Promise.all([
      db.trips.clear(),
      db.activities.clear(),
      db.checklists.clear(),
      db.documents.clear(),
      db.expenses.clear(),
      db.emergencyProfiles.clear(),
      db.nearbyPlaces.clear(),
      db.translationPhrases.clear(),
    ]);
  });

  describe('readiness levels', () => {
    it('is ready when the shell is cached and essentials exist', () => {
      const { level, reasons } = getOfflineReadiness({
        online: true,
        serviceWorker: swStatus(),
        cache: { supported: true, cacheNames: [`${EXPECTED_CACHE_PREFIX}-v1`], entryCount: 4 },
        saved: emptySaved({ trips: 2, totalRecords: 2 }),
      });
      expect(level).toBe('ready');
      expect(reasons.join(' ')).toMatch(/application shell is cached/i);
      expect(reasons.join(' ')).toMatch(/2 saved record/i);
    });

    it('is partial when only saved data exists', () => {
      const { level, reasons } = getOfflineReadiness({
        online: true,
        serviceWorker: swStatus({ state: 'unregistered', controlling: false }),
        cache: { supported: true, cacheNames: [], entryCount: 0 },
        saved: emptySaved({ documents: 1, totalRecords: 1 }),
      });
      expect(level).toBe('partial');
      expect(reasons.join(' ')).toMatch(/Enable offline caching/i);
    });

    it('is partial when only the shell is cached', () => {
      const { level, reasons } = getOfflineReadiness({
        online: true,
        serviceWorker: swStatus(),
        cache: { supported: true, cacheNames: [`${EXPECTED_CACHE_PREFIX}-v1`], entryCount: 2 },
        saved: emptySaved(),
      });
      expect(level).toBe('partial');
      expect(reasons.join(' ')).toMatch(/No trip, document/i);
    });

    it('is not ready when nothing is cached or saved', () => {
      const { level } = getOfflineReadiness({
        online: true,
        serviceWorker: swStatus({ state: 'unregistered' }),
        cache: { supported: true, cacheNames: [], entryCount: 0 },
        saved: emptySaved(),
      });
      expect(level).toBe('not-ready');
    });

    it('explains unsupported browsers and current offline status', () => {
      const { reasons } = getOfflineReadiness({
        online: false,
        serviceWorker: swStatus({ supported: false, state: 'unsupported' }),
        cache: { supported: false, cacheNames: [], entryCount: 0 },
        saved: emptySaved(),
      });
      const text = reasons.join(' ');
      expect(text).toMatch(/cannot cache the app shell/i);
      expect(text).toMatch(/offline right now/i);
    });

    it('is ready with the production Workbox precache bucket', () => {
      const { level } = getOfflineReadiness({
        online: true,
        serviceWorker: swStatus(),
        cache: {
          supported: true,
          cacheNames: [`${WORKBOX_CACHE_PREFIX}-v2-1a2b3c`],
          entryCount: 6,
        },
        saved: emptySaved({ trips: 1, totalRecords: 1 }),
      });
      expect(level).toBe('ready');
    });

    it('does not treat unrelated caches as the app shell', () => {
      const { level } = getOfflineReadiness({
        online: true,
        serviceWorker: swStatus(),
        cache: { supported: true, cacheNames: ['some-other-cache'], entryCount: 9 },
        saved: emptySaved(),
      });
      expect(level).toBe('not-ready');
    });
  });

  describe('saved essentials', () => {
    it('counts records in every local table', async () => {
      await db.emergencyProfiles.put(profile);
      await db.nearbyPlaces.put(place);
      const saved = await getSavedEssentials();
      expect(saved.emergencyProfiles).toBe(1);
      expect(saved.nearbyPlaces).toBe(1);
      expect(saved.totalRecords).toBe(2);
    });

    it('returns zeroes for an empty database', async () => {
      const saved = await getSavedEssentials();
      expect(saved.totalRecords).toBe(0);
    });
  });

  describe('service worker state', () => {
    it('reports unsupported when the Service Worker API is missing', async () => {
      const status = await getServiceWorkerStatus();
      expect(status.supported).toBe(false);
      expect(status.state).toBe('unsupported');
    });

    it('reports unsupported registration attempts without throwing', async () => {
      const status = await registerServiceWorker();
      expect(status.state).toBe('unsupported');
    });

    it('registers and reports a registered worker when supported', async () => {
      const register = vi.fn().mockResolvedValue({ active: { scriptURL: '/sw.js' } });
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          register,
          getRegistration: vi.fn().mockResolvedValue({
            active: { scriptURL: '/sw.js' },
            unregister: vi.fn().mockResolvedValue(true),
          }),
          controller: {},
        },
      });

      const status = await registerServiceWorker();
      expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(status.state).toBe('registered');
      expect(status.controlling).toBe(true);

      const unregistered = await unregisterServiceWorker();
      expect(unregistered.state).toBe('unregistered');

      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'serviceWorker');
    });

    it('returns an error state when registration fails', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          register: vi.fn().mockRejectedValue(new Error('blocked by policy')),
          getRegistration: vi.fn().mockResolvedValue(undefined),
          controller: null,
        },
      });

      const status = await registerServiceWorker();
      expect(status.state).toBe('error');
      expect(status.message).toContain('blocked by policy');

      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'serviceWorker');
    });

    it('reports an error state when registration lookup throws', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          register: vi.fn(),
          getRegistration: vi.fn().mockRejectedValue(new Error('boom')),
          controller: null,
        },
      });

      const status = await getServiceWorkerStatus();
      expect(status.state).toBe('error');

      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'serviceWorker');
    });
  });

  describe('cache summary', () => {
    it('reports unsupported when Cache Storage is unavailable', async () => {
      const summary = await getCacheSummary();
      if (typeof caches === 'undefined') {
        expect(summary.supported).toBe(false);
        expect(summary.message).toMatch(/unavailable/i);
      } else {
        expect(summary.supported).toBe(true);
      }
    });

    it('counts only app-shell cache entries', async () => {
      const entries = new Map<string, number>([
        [EXPECTED_CACHE_PREFIX + '-v1', 3],
        [WORKBOX_CACHE_PREFIX + '-v2-hash', 4],
        ['unrelated-cache', 5],
      ]);
      const mockCaches = {
        keys: vi.fn().mockResolvedValue([...entries.keys()]),
        open: vi.fn(async (name: string) => ({
          keys: async () => Array.from({ length: entries.get(name) ?? 0 }, (_, index) => ({ index })),
        })),
      };
      vi.stubGlobal('caches', mockCaches);

      const summary = await getCacheSummary();
      expect(summary.supported).toBe(true);
      expect(summary.entryCount).toBe(7);
      expect(summary.cacheNames).toContain('unrelated-cache');

      vi.unstubAllGlobals();
    });

    it('recognises both app-shell cache naming schemes', () => {
      expect(isAppShellCacheName(`${EXPECTED_CACHE_PREFIX}-v1`)).toBe(true);
      expect(isAppShellCacheName(`${WORKBOX_CACHE_PREFIX}-v2-abc`)).toBe(true);
      expect(isAppShellCacheName('unrelated-cache')).toBe(false);
    });
  });

  describe('storage and connectivity', () => {
    it('reports storage estimates as unavailable when the API is missing', async () => {
      const estimate = await getStorageEstimate();
      if (!('storage' in navigator)) {
        expect(estimate.supported).toBe(false);
        expect(estimate.usageBytes).toBeNull();
      } else {
        expect(estimate.supported).toBe(true);
      }
    });

    it('formats byte sizes for display', () => {
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(2048)).toBe('2.0 KB');
      expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
      expect(formatBytes(null)).toBe('unknown');
    });

    it('notifies subscribers on online/offline events and unsubscribes cleanly', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToConnectivity(callback);

      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
      expect(callback).toHaveBeenNthCalledWith(1, false);
      expect(callback).toHaveBeenNthCalledWith(2, true);

      unsubscribe();
      window.dispatchEvent(new Event('offline'));
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('snapshot', () => {
    it('combines status, saved data and readiness', async () => {
      await db.emergencyProfiles.put(profile);
      const snapshot = await buildOfflineSnapshot();
      expect(snapshot.saved.emergencyProfiles).toBe(1);
      expect(['ready', 'partial', 'not-ready']).toContain(snapshot.readiness);
      expect(snapshot.readinessReasons.length).toBeGreaterThan(0);
      expect(snapshot.checkedAt).toMatch(/T/);
    });
  });
});
