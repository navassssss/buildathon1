/**
 * Offline readiness service (T-009 / F-OFF-001).
 *
 * Local-only: reports what is already stored on this device and whether the
 * app shell can be served offline. No network requests, no telemetry, no cloud
 * sync, and no third-party tile/API access.
 */

import { db } from './db';

export const APP_SHELL_SW_URL = '/sw.js';
export const EXPECTED_CACHE_PREFIX = 'traveller-shell';
/** vite-plugin-pwa/Workbox precache namespace, used in production builds. */
export const WORKBOX_CACHE_PREFIX = 'workbox-precache';
export const OFFLINE_MANIFEST_URL = '/manifest.webmanifest';

/** True when a Cache Storage bucket belongs to the app-shell worker. */
export function isAppShellCacheName(name: string): boolean {
  return name.startsWith(EXPECTED_CACHE_PREFIX) || name.startsWith(WORKBOX_CACHE_PREFIX);
}

export type ServiceWorkerState =
  | 'unsupported'
  | 'unregistered'
  | 'registering'
  | 'registered'
  | 'error';

export interface ServiceWorkerStatus {
  supported: boolean;
  state: ServiceWorkerState;
  /** True when a worker controls this page right now. */
  controlling: boolean;
  scriptUrl: string;
  message?: string;
}

export interface CacheSummary {
  supported: boolean;
  cacheNames: string[];
  entryCount: number;
  message?: string;
}

export interface SavedEssentials {
  trips: number;
  activities: number;
  checklists: number;
  documents: number;
  expenses: number;
  emergencyProfiles: number;
  nearbyPlaces: number;
  translationPhrases: number;
  /** Sum of all saved records above. */
  totalRecords: number;
}

export interface StorageEstimateSummary {
  supported: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
  usagePercent: number | null;
  message?: string;
}

export type ReadinessLevel = 'ready' | 'partial' | 'not-ready';

export interface OfflineSnapshot {
  online: boolean;
  serviceWorker: ServiceWorkerStatus;
  cache: CacheSummary;
  saved: SavedEssentials;
  storage: StorageEstimateSummary;
  readiness: ReadinessLevel;
  readinessReasons: string[];
  checkedAt: string;
}

function bytesToLabel(bytes: number | null): string {
  if (bytes === null) return 'unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatBytes(bytes: number | null): string {
  return bytesToLabel(bytes);
}

/** True when this browser exposes the Service Worker API. */
export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/** Read the current service-worker registration/control state. */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  if (!isServiceWorkerSupported()) {
    return {
      supported: false,
      state: 'unsupported',
      controlling: false,
      scriptUrl: APP_SHELL_SW_URL,
      message: 'This browser does not support service workers, so the app shell cannot be cached.',
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const controlling = Boolean(navigator.serviceWorker.controller);
    if (!registration) {
      return {
        supported: true,
        state: 'unregistered',
        controlling,
        scriptUrl: APP_SHELL_SW_URL,
        message: 'Offline app-shell caching has not been enabled on this browser yet.',
      };
    }
    return {
      supported: true,
      state: 'registered',
      controlling,
      scriptUrl: registration.active?.scriptURL ?? APP_SHELL_SW_URL,
      ...(controlling
        ? {}
        : {
            message:
              'Registered. Reload once to let the service worker control this page and serve it offline.',
          }),
    };
  } catch {
    return {
      supported: true,
      state: 'error',
      controlling: false,
      scriptUrl: APP_SHELL_SW_URL,
      message: 'Could not read the service-worker registration state.',
    };
  }
}

/**
 * Register the app-shell service worker. Safe to call repeatedly.
 * Returns a status object instead of throwing so the UI can show honest states.
 */
export async function registerServiceWorker(
  scriptUrl: string = APP_SHELL_SW_URL
): Promise<ServiceWorkerStatus> {
  if (!isServiceWorkerSupported()) {
    return {
      supported: false,
      state: 'unsupported',
      controlling: false,
      scriptUrl,
      message: 'This browser does not support service workers.',
    };
  }

  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, { scope: '/' });
    const current = await getServiceWorkerStatus();
    return {
      supported: true,
      state: 'registered',
      controlling: Boolean(navigator.serviceWorker.controller) || Boolean(registration.active),
      scriptUrl: registration.active?.scriptURL ?? scriptUrl,
      ...(current.message ? { message: current.message } : {}),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Service-worker registration failed.';
    return {
      supported: true,
      state: 'error',
      controlling: false,
      scriptUrl,
      message: `Could not enable offline app-shell caching: ${message}`,
    };
  }
}

/** Unregister the offline worker (useful for troubleshooting). */
export async function unregisterServiceWorker(): Promise<ServiceWorkerStatus> {
  if (!isServiceWorkerSupported()) {
    return {
      supported: false,
      state: 'unsupported',
      controlling: false,
      scriptUrl: APP_SHELL_SW_URL,
      message: 'This browser does not support service workers.',
    };
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
    }
    return {
      supported: true,
      state: 'unregistered',
      controlling: false,
      scriptUrl: APP_SHELL_SW_URL,
      message: 'Offline app-shell caching is disabled. Saved data is untouched.',
    };
  } catch {
    return {
      supported: true,
      state: 'error',
      controlling: false,
      scriptUrl: APP_SHELL_SW_URL,
      message: 'Could not disable offline app-shell caching.',
    };
  }
}

/** Summarise the Cache Storage entries created by the app-shell worker. */
export async function getCacheSummary(): Promise<CacheSummary> {
  if (typeof caches === 'undefined') {
    return {
      supported: false,
      cacheNames: [],
      entryCount: 0,
      message: 'Cache Storage is unavailable here; offline app-shell caching cannot be inspected.',
    };
  }
  try {
    const cacheNames = await caches.keys();
    let entryCount = 0;
    for (const name of cacheNames) {
      if (!isAppShellCacheName(name)) continue;
      const cache = await caches.open(name);
      entryCount += (await cache.keys()).length;
    }
    return { supported: true, cacheNames, entryCount };
  } catch {
    return {
      supported: false,
      cacheNames: [],
      entryCount: 0,
      message: 'Cache Storage could not be read (private mode or browser policy).',
    };
  }
}

/** Count the essentials already stored locally in IndexedDB. */
export async function getSavedEssentials(): Promise<SavedEssentials> {
  const [
    trips,
    activities,
    checklists,
    documents,
    expenses,
    emergencyProfiles,
    nearbyPlaces,
    translationPhrases,
  ] = await Promise.all([
    db.trips.count(),
    db.activities.count(),
    db.checklists.count(),
    db.documents.count(),
    db.expenses.count(),
    db.emergencyProfiles.count(),
    db.nearbyPlaces.count(),
    db.translationPhrases.count(),
  ]);

  return {
    trips,
    activities,
    checklists,
    documents,
    expenses,
    emergencyProfiles,
    nearbyPlaces,
    translationPhrases,
    totalRecords:
      trips +
      activities +
      checklists +
      documents +
      expenses +
      emergencyProfiles +
      nearbyPlaces +
      translationPhrases,
  };
}

/** Best-effort storage usage estimate; clearly reports when unavailable. */
export async function getStorageEstimate(): Promise<StorageEstimateSummary> {
  const storage =
    typeof navigator !== 'undefined' && 'storage' in navigator ? navigator.storage : undefined;
  if (!storage || typeof storage.estimate !== 'function') {
    return {
      supported: false,
      usageBytes: null,
      quotaBytes: null,
      usagePercent: null,
      message: 'This browser does not expose a storage estimate.',
    };
  }
  try {
    const estimate = await storage.estimate();
    const usage = typeof estimate.usage === 'number' ? estimate.usage : null;
    const quota = typeof estimate.quota === 'number' ? estimate.quota : null;
    const percent = usage !== null && quota ? Math.min(100, (usage / quota) * 100) : null;
    return {
      supported: true,
      usageBytes: usage,
      quotaBytes: quota,
      usagePercent: percent,
    };
  } catch {
    return {
      supported: false,
      usageBytes: null,
      quotaBytes: null,
      usagePercent: null,
      message: 'Storage usage could not be read.',
    };
  }
}

/**
 * Derive an honest readiness level. Offline mode is only "ready" when the
 * shell is cached and at least one essential is saved; "partial" when one of
 * those is true; otherwise "not-ready".
 */
export function getOfflineReadiness(snapshot: {
  online: boolean;
  serviceWorker: ServiceWorkerStatus;
  cache: CacheSummary;
  saved: SavedEssentials;
}): { level: ReadinessLevel; reasons: string[] } {
  const reasons: string[] = [];
  const shellCached =
    snapshot.cache.supported &&
    snapshot.cache.entryCount > 0 &&
    snapshot.cache.cacheNames.some(isAppShellCacheName);
  const hasEssentials = snapshot.saved.totalRecords > 0;

  if (shellCached) {
    reasons.push('The application shell is cached on this device.');
  } else if (!snapshot.serviceWorker.supported) {
    reasons.push('This browser cannot cache the app shell (no service-worker support).');
  } else if (snapshot.serviceWorker.state !== 'registered') {
    reasons.push('Enable offline caching so the app can open without a connection.');
  } else {
    reasons.push('The service worker is registered but cached app-shell files were not confirmed.');
  }

  if (hasEssentials) {
    reasons.push(`${snapshot.saved.totalRecords} saved record(s) are available locally.`);
  } else {
    reasons.push('No trip, document, expense, emergency or phrase data is saved yet.');
  }

  if (!snapshot.online) {
    reasons.push('You are offline right now.');
  }

  let level: ReadinessLevel = 'not-ready';
  if (shellCached && hasEssentials) level = 'ready';
  else if (shellCached || hasEssentials) level = 'partial';

  return { level, reasons };
}

/** Build a complete, honest snapshot of offline readiness. */
export async function buildOfflineSnapshot(): Promise<OfflineSnapshot> {
  const [serviceWorker, cache, saved, storage] = await Promise.all([
    getServiceWorkerStatus(),
    getCacheSummary(),
    getSavedEssentials(),
    getStorageEstimate(),
  ]);
  const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  const { level, reasons } = getOfflineReadiness({ online, serviceWorker, cache, saved });

  return {
    online,
    serviceWorker,
    cache,
    saved,
    storage,
    readiness: level,
    readinessReasons: reasons,
    checkedAt: new Date().toISOString(),
  };
}

/** Subscribe to browser online/offline changes. Returns an unsubscribe fn. */
export function subscribeToConnectivity(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/** Category labels and copy for "what works offline" guidance. */
export const OFFLINE_CAPABILITIES: Array<{
  key: keyof SavedEssentials | 'shell' | 'maps';
  title: string;
  detail: string;
}> = [
  {
    key: 'shell',
    title: 'Application shell',
    detail: 'The interface loads from the on-device cache when the network is unavailable.',
  },
  {
    key: 'trips',
    title: 'Saved trips and activities',
    detail: 'Trips and activity schedules are already stored in IndexedDB.',
  },
  {
    key: 'documents',
    title: 'Document vault entries',
    detail: 'Encrypted documents stay on the device; the vault still requires your passphrase.',
  },
  {
    key: 'emergencyProfiles',
    title: 'Emergency profile and contacts',
    detail: 'Medical profile, trusted contacts and country emergency numbers work offline.',
  },
  {
    key: 'translationPhrases',
    title: 'Saved phrase packs',
    detail: 'Bundled and saved phrases are available without a connection.',
  },
  {
    key: 'maps',
    title: 'Schematic map fixtures',
    detail: 'Local place fixtures only — no third-party tiles are fetched or cached.',
  },
];
