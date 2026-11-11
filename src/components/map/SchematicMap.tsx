import React, { useMemo, useState } from 'react';
import type { NearbyPlace } from '../../types';

/** Minimal shape the schematic map needs — deliberately independent of distance. */
export interface MapPlace {
  id: string;
  name: string;
  category: NearbyPlace['category'];
  coordinates: { lat: number; lng: number };
  detail?: string;
}

interface CategoryStyle {
  fill: string;
  glyph: string;
  label: string;
}

export interface SchematicDirection {
  distanceMeters: number;
  distanceLabel: string;
  bearingDegrees: number;
  bearingLabel: string;
  label: string;
}

const CATEGORY_STYLES: Record<NearbyPlace['category'], CategoryStyle> = {
  hospital: { fill: '#fb7185', glyph: 'H', label: 'Hospital' },
  pharmacy: { fill: '#34d399', glyph: 'Rx', label: 'Pharmacy' },
  police: { fill: '#60a5fa', glyph: 'P', label: 'Police' },
  atm: { fill: '#facc15', glyph: '$', label: 'ATM' },
  restaurant: { fill: '#fb923c', glyph: 'R', label: 'Restaurant' },
  accommodation: { fill: '#c084fc', glyph: 'B', label: 'Accommodation' },
  embassy: { fill: '#22d3ee', glyph: 'E', label: 'Embassy' },
  attraction: { fill: '#f472b6', glyph: '★', label: 'Attraction' },
};

const WIDTH = 600;
const HEIGHT = 360;
const PADDING = 36;
const MIN_SPAN_DEGREES = 0.01;
const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function formatSchematicDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function bearingToCompassLabel(bearingDegrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalized = ((bearingDegrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return dirs[index];
}

/**
 * Local straight-line (great-circle) direction from one point to another.
 * Uses bundled coordinates only; this is schematic guidance, not road routing.
 */
export function getSchematicDirection(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): SchematicDirection {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = EARTH_RADIUS_METERS * c;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearingDegrees = (toDegrees(Math.atan2(y, x)) + 360) % 360;
  const bearingLabel = bearingToCompassLabel(bearingDegrees);
  const distanceLabel = formatSchematicDistance(distanceMeters);

  return {
    distanceMeters,
    distanceLabel,
    bearingDegrees,
    bearingLabel,
    label: `${bearingLabel} · ${distanceLabel} straight line (schematic, not turn-by-turn)`,
  };
}

interface SchematicMapProps {
  places: MapPlace[];
  /** Optional user/fixture centre to display as a crosshair and direction origin. */
  center?: { lat: number; lng: number } | null;
  ariaLabel?: string;
  emptyMessage?: string;
  caption?: string;
}

/**
 * Accessible, dependency-free schematic map.
 *
 * Positions are a local equirectangular projection of bundled fixture
 * coordinates only. No tiles, geocoding, road routing or external requests.
 * When a centre and a selected place are available, a straight-line schematic
 * bearing/distance is shown (not turn-by-turn directions).
 */
export const SchematicMap: React.FC<SchematicMapProps> = ({
  places,
  center,
  ariaLabel = 'Schematic map of local places',
  emptyMessage = 'No local places to show on the map yet.',
  caption = 'Schematic positions and straight-line guidance from bundled local fixtures/coordinates only. Not road or turn-by-turn navigation.',
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projection = useMemo(() => {
    const points = [...places.map((place) => place.coordinates), ...(center ? [center] : [])];
    if (points.length === 0) {
      return { toX: () => 0, toY: () => 0 };
    }

    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);

    if (maxLat - minLat < MIN_SPAN_DEGREES) {
      const mid = (minLat + maxLat) / 2;
      minLat = mid - MIN_SPAN_DEGREES / 2;
      maxLat = mid + MIN_SPAN_DEGREES / 2;
    }
    if (maxLng - minLng < MIN_SPAN_DEGREES) {
      const mid = (minLng + maxLng) / 2;
      minLng = mid - MIN_SPAN_DEGREES / 2;
      maxLng = mid + MIN_SPAN_DEGREES / 2;
    }

    const spanLat = maxLat - minLat;
    const spanLng = maxLng - minLng;
    const innerWidth = WIDTH - PADDING * 2;
    const innerHeight = HEIGHT - PADDING * 2;

    return {
      toX: (lng: number) => PADDING + ((lng - minLng) / spanLng) * innerWidth,
      toY: (lat: number) => PADDING + ((maxLat - lat) / spanLat) * innerHeight,
    };
  }, [places, center]);

  const selected = places.find((place) => place.id === selectedId) ?? null;
  const schematicDirection = useMemo(() => {
    if (!center || !selected) return null;
    return getSchematicDirection(center, selected.coordinates);
  }, [center, selected]);

  const categoriesPresent = useMemo(
    () => Array.from(new Set(places.map((place) => place.category))),
    [places]
  );

  if (places.length === 0) {
    return (
      <section
        aria-label={ariaLabel}
        className="rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-8 text-center"
      >
        <p role="status" className="text-sm text-slate-300">
          {emptyMessage}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          This map only uses bundled local fixtures — no external map service is contacted.
        </p>
      </section>
    );
  }

  return (
    <section aria-label={ariaLabel} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">Local schematic map</h3>
        <span className="text-[11px] text-slate-500">Offline fixture · no tiles</span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${ariaLabel}: ${places.length} place${places.length === 1 ? '' : 's'} plotted`}
          className="w-full h-auto"
        >
          <title>{ariaLabel}</title>
          <desc>
            Schematic map plotting {places.length} local fixture places. When a centre and selected place exist, a straight-line schematic direction is shown. No third-party map data or road routing.
          </desc>

          <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#0b1220" />
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
            <g key={`grid-${ratio}`} stroke="#1e293b" strokeWidth={1}>
              <line x1={0} y1={HEIGHT * ratio} x2={WIDTH} y2={HEIGHT * ratio} />
              <line x1={WIDTH * ratio} y1={0} x2={WIDTH * ratio} y2={HEIGHT} />
            </g>
          ))}

          <text x={16} y={24} fill="#94a3b8" fontSize={12} fontWeight={600}>
            N ↑
          </text>
          <g aria-hidden="true">
            <line x1={WIDTH - 120} y1={HEIGHT - 22} x2={WIDTH - 36} y2={HEIGHT - 22} stroke="#94a3b8" strokeWidth={2} />
            <text x={WIDTH - 120} y={HEIGHT - 30} fill="#94a3b8" fontSize={10}>
              schematic scale
            </text>
          </g>

          {center && (
            <g
              transform={`translate(${projection.toX(center.lng)}, ${projection.toY(center.lat)})`}
              aria-label="Your selected location"
            >
              <circle r={14} fill="none" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 3" />
              <circle r={4} fill="#38bdf8" />
              <text y={-18} textAnchor="middle" fill="#7dd3fc" fontSize={10}>
                You
              </text>
            </g>
          )}

          {center && selected && schematicDirection && (
            <g data-testid="schematic-direction-line" aria-label="Schematic straight-line direction">
              <line
                x1={projection.toX(center.lng)}
                y1={projection.toY(center.lat)}
                x2={projection.toX(selected.coordinates.lng)}
                y2={projection.toY(selected.coordinates.lat)}
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.9}
              />
            </g>
          )}

          {places.map((place) => {
            const style = CATEGORY_STYLES[place.category];
            const isSelected = place.id === selectedId;
            const x = projection.toX(place.coordinates.lng);
            const y = projection.toY(place.coordinates.lat);
            return (
              <g
                key={place.id}
                data-testid="map-marker"
                role="img"
                tabIndex={0}
                aria-label={`${style.label}: ${place.name}${place.detail ? `, ${place.detail}` : ''}`}
                onClick={() => setSelectedId(isSelected ? null : place.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedId(isSelected ? null : place.id);
                  }
                }}
                className="cursor-pointer focus:outline-none"
                transform={`translate(${x}, ${y})`}
              >
                <title>{`${style.label}: ${place.name}`}</title>
                {isSelected && (
                  <circle r={16} fill="none" stroke="#f8fafc" strokeWidth={2} />
                )}
                <circle r={11} fill={style.fill} stroke="#0b1220" strokeWidth={2} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={style.glyph.length > 1 ? 8 : 11}
                  fontWeight={700}
                  fill="#0b1220"
                >
                  {style.glyph}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p aria-live="polite" className="text-xs text-slate-300 min-h-[1rem]">
        {selected ? `${CATEGORY_STYLES[selected.category].label}: ${selected.name}` : 'Select a marker or place below.'}
      </p>

      {center && (
        <div
          className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2"
          role="status"
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold text-sky-300 uppercase tracking-wide">
            Schematic direction (local, straight line)
          </p>
          {selected && schematicDirection ? (
            <p className="text-xs text-slate-300 mt-0.5" data-testid="schematic-direction-label">
              To <span className="text-slate-100 font-medium">{selected.name}</span>: {schematicDirection.label}. No roads or turn-by-turn routing.
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              Select a place to see straight-line bearing and distance from your location/centre. Not turn-by-turn navigation.
            </p>
          )}
        </div>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {places.map((place) => {
          const style = CATEGORY_STYLES[place.category];
          return (
            <li key={place.id}>
              <button
                type="button"
                data-testid="map-place-button"
                aria-pressed={place.id === selectedId}
                onClick={() => setSelectedId(place.id === selectedId ? null : place.id)}
                className={`w-full text-left rounded-lg border px-2.5 py-1.5 text-xs transition ${
                  place.id === selectedId
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: style.fill }}
                />
                <span className="font-medium">{place.name}</span>
                {place.detail ? (
                  <span className="text-slate-500"> · {place.detail}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {categoriesPresent.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {categoriesPresent.map((category) => (
            <span key={category} className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <span
                aria-hidden="true"
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_STYLES[category].fill }}
              />
              {CATEGORY_STYLES[category].label}
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500">{caption}</p>
    </section>
  );
};

export default SchematicMap;
