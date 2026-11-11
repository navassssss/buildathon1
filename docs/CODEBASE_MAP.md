# Codebase map

**Last inspected:** 2026-11-11  
**Workspace:** `wks_7b838da41ff3a956`  
**Updated by:** Orchestrator

## Application structure

| Path/module | Role | Status/evidence |
|---|---|---|
| `src/main.tsx`, `src/App.tsx`, `src/index.css` | React entry, tab shell and styling | App wires trip planner, packing, vault, nearby, SOS, expenses, assistant, translation and offline components |
| `src/types/index.ts` | Shared feature contracts | Includes trip, checklist, document, expense, emergency, nearby-place (including attraction) and translation types |
| `src/services/db.ts` | Dexie IndexedDB schema | Local tables for trips, activities, checklists, documents, expenses, emergency profiles, nearby places and translation phrases |
| `src/stores/tripStore.ts`, `src/components/trips/` | Trip create/edit/schedule UI and local state | Integrated T-001; current suite passes |
| `src/stores/packingStore.ts`, `src/utils/packingGenerator.ts`, `src/components/packing/` | Dynamic packing list and controls | Integrated T-002; stores checklist in Dexie; explicit re-evaluation action |
| `src/services/encryption.ts`, `src/services/documentStorage.ts`, `src/stores/documentStore.ts`, `src/components/vault/` | Encrypted document vault | AES-GCM/PBKDF2; OPFS-first encrypted blobs with IndexedDB fallback; focused coverage includes fallback and mocked OPFS cases |
| `src/services/nearbyPlaces.ts`, `src/components/nearby/`, `src/components/map/SchematicMap.tsx` | Local POI lookup, bundled city fixtures, attraction filter and accessible SVG map | Computed straight-line bearing/distance only; no external tiles, geocoding or road routing |
| `src/services/location.ts` | Browser geolocation and distance helpers | Permission-gated; geolocation is user initiated |
| `src/services/sos.ts`, `src/components/sos/` | Emergency information, medical profile, SOS drafts, safe-route hints and lost/found | Local-only; no dispatch/auto-send; location share is a user-triggered snapshot |
| `src/fixtures/expenses/`, `src/services/expenses.ts`, `src/components/expenses/` | Currency conversion and expense/budget/group UI | Bundled deterministic mock FX and local Dexie storage |
| `src/services/assistant.ts`, `src/components/assistant/` | Context-aware travel suggestions | Deterministic local responses, no external AI provider |
| `src/fixtures/translation/`, `src/services/translation.ts`, `src/components/translation/` | Phrase packs, text and sample image/voice flows | Local-only; image captions use bundled examples, not general OCR |
| `src/services/offlineReadiness.ts`, `src/components/offline/` | Offline readiness, saved-place map, status and caching controls | Same-origin service-worker app shell; local fixtures and schematic bearing/distance only; no turn-by-turn routing |
| `public/manifest.webmanifest`, `public/icon.svg`, `vite.config.ts` | PWA manifest/icon and service-worker generation | `vite-plugin-pwa@1.3.0`, `generateSW`, five same-origin precache entries; no runtime caching |
| `src/**/*.test.*` | Vitest unit/component coverage | Latest full suite: 23 files / 219 tests passed |

## Runtime and data flow

`src/App.tsx` selects feature components by active tab. Feature data is stored in Dexie/IndexedDB or namespaced localStorage; document file ciphertext uses OPFS when available and IndexedDB fallback otherwise. POIs, FX rates, weather/assistant responses, translation examples and maps are local fixtures. The service worker precaches the app shell only; feature data remains in browser storage. Location access requires explicit user action.

## Current verification

- `npm run test`: 23 files / 219 tests passed.
- `npm run type-check`: passed.
- `npm run build`: passed; PWA worker generated with five same-origin precache entries (598.03 KiB).
- `npm run lint`: unavailable (no script configured).
- Build warning: main JavaScript chunk exceeds 500 kB (555.56 kB minified, 157.19 kB gzip).
- Real-browser/offline/device flows were not manually verified; see `PROJECT_STATE.md`.
