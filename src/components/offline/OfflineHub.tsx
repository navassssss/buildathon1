import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  CloudOff,
  Database,
  Download,
  HardDrive,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  APP_SHELL_SW_URL,
  OFFLINE_CAPABILITIES,
  buildOfflineSnapshot,
  formatBytes,
  getServiceWorkerStatus,
  registerServiceWorker,
  subscribeToConnectivity,
  unregisterServiceWorker,
  type OfflineSnapshot,
} from '../../services/offlineReadiness';
import {
  findNearbyPlacesForCity,
  getLocalCities,
  getLocalCity,
} from '../../services/nearbyPlaces';
import { SchematicMap, type MapPlace } from '../map/SchematicMap';
import { db } from '../../services/db';
import type { NearbyPlace } from '../../types';

const readinessStyles: Record<
  OfflineSnapshot['readiness'],
  { label: string; classes: string; Icon: React.FC<{ className?: string }> }
> = {
  ready: {
    label: 'Offline ready',
    classes: 'border-emerald-700/60 bg-emerald-950/40 text-emerald-200',
    Icon: ShieldCheck,
  },
  partial: {
    label: 'Partially ready',
    classes: 'border-amber-700/60 bg-amber-950/40 text-amber-200',
    Icon: ShieldAlert,
  },
  'not-ready': {
    label: 'Not ready for offline use',
    classes: 'border-slate-700 bg-slate-900/60 text-slate-300',
    Icon: CloudOff,
  },
};

const savedRows: Array<{ key: keyof OfflineSnapshot['saved']; label: string }> = [
  { key: 'trips', label: 'Trips' },
  { key: 'activities', label: 'Activities' },
  { key: 'checklists', label: 'Packing items' },
  { key: 'documents', label: 'Documents (encrypted)' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'emergencyProfiles', label: 'Emergency profiles' },
  { key: 'nearbyPlaces', label: 'Nearby place fixtures' },
  { key: 'translationPhrases', label: 'Saved phrases' },
];

/** Shape a saved/fixture place for the schematic map. */
function toMapPlace(place: NearbyPlace): MapPlace {
  return {
    id: place.id,
    name: place.name,
    category: place.category,
    coordinates: place.coordinates,
    detail: place.address,
  };
}

type MapSource = 'saved' | 'fixtures';

export const OfflineHub: React.FC = () => {
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mapCity, setMapCity] = useState('london');
  const [mapPlaces, setMapPlaces] = useState<MapPlace[]>([]);
  const [mapSource, setMapSource] = useState<MapSource>('fixtures');
  const [isMapLoading, setIsMapLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await buildOfflineSnapshot();
      setSnapshot(next);
    } catch {
      setActionError('Could not read offline status from this device.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToConnectivity(() => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    // In production, enable app-shell caching automatically so a return visit
    // can open offline. Dev builds never register a worker, and an existing
    // registration is reused so there is exactly one registration path.
    if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      void (async () => {
        const status = await getServiceWorkerStatus();
        if (status.state === 'unregistered') {
          await registerServiceWorker(APP_SHELL_SW_URL);
          await refresh();
        }
      })();
    }
  }, [refresh]);

  useEffect(() => {
    // Offline places map: show locally saved places when there are any,
    // otherwise fall back to clearly labelled bundled fixtures. No map tiles,
    // geocoding or directions are requested.
    let cancelled = false;
    void (async () => {
      setIsMapLoading(true);
      try {
        const saved = await db.nearbyPlaces.toArray();
        if (cancelled) return;
        if (saved.length > 0) {
          setMapSource('saved');
          setMapPlaces(saved.map(toMapPlace));
        } else {
          const fixtures = await findNearbyPlacesForCity(mapCity, { limit: 50 });
          if (cancelled) return;
          setMapSource('fixtures');
          setMapPlaces(fixtures.map(toMapPlace));
        }
      } catch {
        if (!cancelled) {
          setMapSource('fixtures');
          setMapPlaces([]);
        }
      } finally {
        if (!cancelled) setIsMapLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapCity]);

  const fixtureCities = getLocalCities();
  const mapCenter =
    mapSource === 'fixtures' ? getLocalCity(mapCity)?.coordinates ?? null : null;

  const handleEnable = async () => {
    setIsRegistering(true);
    setActionError(null);
    setActionMessage(null);
    const status = await registerServiceWorker(APP_SHELL_SW_URL);
    if (status.state === 'error' || status.state === 'unsupported') {
      setActionError(status.message ?? 'Could not enable offline caching.');
    } else {
      setActionMessage(
        status.controlling
          ? 'Offline caching is enabled on this device.'
          : 'Offline caching enabled. Reload once so the cached app shell can serve this page.'
      );
    }
    await refresh();
    setIsRegistering(false);
  };

  const handleDisable = async () => {
    setIsRegistering(true);
    setActionError(null);
    setActionMessage(null);
    const status = await unregisterServiceWorker();
    if (status.state === 'error') {
      setActionError(status.message ?? 'Could not disable offline caching.');
    } else {
      setActionMessage(status.message ?? 'Offline caching disabled. Saved data is untouched.');
    }
    await refresh();
    setIsRegistering(false);
  };

  if (isLoading && !snapshot) {
    return (
      <div className="p-10 text-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Checking what is available offline…</p>
      </div>
    );
  }

  const current = snapshot;
  const readiness = readinessStyles[current?.readiness ?? 'not-ready'];
  const ReadinessIcon = readiness.Icon;
  const sw = current?.serviceWorker;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CloudOff className="w-6 h-6 text-sky-400" /> Offline Hub
          </h1>
          <p className="text-sm text-slate-400">
            Check what is cached for this app and which essentials are already saved on your device.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium transition disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isLoading ? 'Checking…' : 'Refresh status'}
        </button>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`rounded-2xl border p-4 flex items-start gap-3 ${readiness.classes}`}
      >
        <ReadinessIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">{readiness.label}</p>
          <ul className="text-xs space-y-0.5">
            {(current?.readinessReasons ?? ['Status has not been checked yet.']).map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      </div>

      {actionMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-200 text-sm p-3 flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950/60 text-red-200 text-sm p-3 flex items-start gap-2"
        >
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            {current?.online ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400" />
            )}
            Connection
          </h2>
          <p className="text-sm text-slate-300">
            {current?.online
              ? 'Online right now. Cached files and saved data remain available if the connection drops.'
              : 'Offline right now. Only the cached app shell and locally saved essentials are available.'}
          </p>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" /> App-shell caching
          </h2>

          {!sw?.supported ? (
            <p className="text-xs text-amber-300 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {sw?.message ??
                'This browser does not support service workers, so the app cannot be cached for offline opening. Saved data still works while the app is open.'}
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-300">
                Status:{' '}
                <span className="font-semibold text-white">
                  {sw.state === 'registered' ? 'Enabled' : 'Not enabled'}
                </span>
                {sw.controlling ? ' · controlling this page' : ''}
              </p>
              {sw.message && <p className="text-xs text-slate-400">{sw.message}</p>}
              <p className="text-[11px] text-slate-500">
                Cached shell entries:{' '}
                {current?.cache.supported ? current.cache.entryCount : 'unavailable'}
                {current?.cache.cacheNames.length
                  ? ` · ${current.cache.cacheNames.join(', ')}`
                  : ''}
              </p>
              {!current?.cache.supported && current?.cache.message && (
                <p className="text-xs text-amber-300">{current.cache.message}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleEnable()}
                  disabled={isRegistering}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition disabled:opacity-50"
                >
                  {isRegistering ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {sw.state === 'registered' ? 'Re-check caching' : 'Enable offline caching'}
                </button>
                {sw.state === 'registered' && (
                  <button
                    type="button"
                    onClick={() => void handleDisable()}
                    disabled={isRegistering}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition disabled:opacity-50"
                  >
                    Disable caching
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" /> Saved essentials on this device
          </h2>
          <span className="text-xs text-slate-400">
            {current?.saved.totalRecords ?? 0} total records
          </span>
        </div>

        {(current?.saved.totalRecords ?? 0) === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center">
            <Database className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-300">Nothing saved yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add a trip, packing list, document, expense, emergency profile or phrase to make it
              available offline.
            </p>
          </div>
        ) : (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {savedRows.map((row) => (
              <div
                key={row.key}
                className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5"
              >
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">{row.label}</dt>
                <dd className="text-lg font-semibold text-white">{current?.saved[row.key] ?? 0}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" /> Offline places map
          </h2>
          <span role="status" className="text-[11px] text-slate-400">
            {mapSource === 'saved'
              ? 'Showing places saved on this device.'
              : 'Showing bundled fixture places for the selected city.'}
          </span>
        </div>

        {mapSource === 'fixtures' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="offline-map-city" className="text-xs text-slate-400">
              Fixture city
            </label>
            <select
              id="offline-map-city"
              value={mapCity}
              onChange={(event) => setMapCity(event.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {fixtureCities.map((city) => (
                <option key={city.code} value={city.code}>
                  {city.name}, {city.country}
                </option>
              ))}
            </select>
          </div>
        )}

        {isMapLoading ? (
          <p role="status" className="text-xs text-slate-400 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading local map places…
          </p>
        ) : (
          <SchematicMap
            places={mapPlaces}
            center={mapCenter}
            ariaLabel="Offline saved places schematic map"
            emptyMessage="No places are saved and no bundled fixture places could be loaded for this city."
            caption="Schematic positions from bundled local fixtures or saved device records only — no map tiles, geocoding or directions. Not authoritative navigation."
          />
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-slate-400" /> Storage
        </h2>
        {!current?.storage.supported ? (
          <p className="text-xs text-amber-300">
            {current?.storage.message ?? 'Storage usage is not available in this browser.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-300">
              Using {formatBytes(current.storage.usageBytes)} of{' '}
              {formatBytes(current.storage.quotaBytes)} available to this origin.
            </p>
            <div
              className="h-2 rounded-full bg-slate-800 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(current.storage.usagePercent ?? 0)}
              aria-label="Local storage used"
            >
              <div
                className="h-full bg-sky-500"
                style={{ width: `${Math.min(100, current.storage.usagePercent ?? 0)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Estimates come from the browser; clearing site data removes everything stored here.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
        <h2 className="text-sm font-bold text-white">What works offline</h2>
        <ul className="grid sm:grid-cols-2 gap-2">
          {OFFLINE_CAPABILITIES.map((capability) => (
            <li
              key={capability.key}
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
            >
              <p className="text-xs font-semibold text-slate-200">{capability.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{capability.detail}</p>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-1">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Maps and place data are schematic local fixtures, not authoritative navigation. Nothing is
          synced to a cloud account and no telemetry is collected.
        </p>
      </section>

      {current && (
        <p className="text-[11px] text-slate-500 text-right">
          Last checked {new Date(current.checkedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default OfflineHub;
