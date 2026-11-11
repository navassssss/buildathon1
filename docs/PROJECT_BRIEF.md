# Project brief

**Status:** Approved for the T-001–T-009 buildathon scope by user delegation to the Planner  
**Last updated:** 2026-11-11

## Product and users

- **Product type:** Offline-first Progressive Web App (PWA).
- **Product name:** Traveller Companion (working title).
- **Intended users:** Independent travelers planning and traveling with unreliable connectivity.
- **User problem / goal:** Prepare for trips and access saved travel, location, document, expense, translation, and emergency essentials while online or offline.
- **Success criteria:** Complete the approved T-001–T-009 workflows in supported browsers, with saved essentials available offline and clear permission, error, and recovery states.

## Scope

- **In scope:** T-001–T-009 on the task board. P0 core: T-001–T-006. P1 secondary: T-007–T-009.
- **Out of scope for this buildathon:** Native apps, account/cloud sync, live AI provider calls, real emergency dispatch, and third-party map tiles. Nearby results, weather, exchange rates, and translation use local mock fixtures.
- **MVP priorities:** P0 means core buildathon workflows; P1 means secondary workflows. The feature index records source occurrences and any intentional merges.

## Technical decisions

- **Framework and build tool:** React 19.3, Vite 8.3, TypeScript 7.0, Tailwind CSS 4, Zustand 5. Runtime: Node.js 24 LTS (minimum 22.12). Lock exact dependency patches in `package-lock.json`.
- **PWA and mapping:** `vite-plugin-pwa` 1.3 with a service worker. MapLibre GL JS was selected for local mock maps; the current implementation uses an accessible SVG schematic fallback over bundled coordinates, with no external tiles/geocoding/routing. This implementation deviation is recorded in `PROJECT_STATE.md`.
- **Storage:** Dexie 4 over IndexedDB for metadata and fallback file blobs. Use the Origin Private File System (OPFS) for document blobs when available; mirror/fallback to IndexedDB. Apply a 500 MB soft application cap and report browser quota failures.
- **Local encryption:** Web Crypto AES-GCM-256 for document/profile data. Derive the vault key with PBKDF2-HMAC-SHA-256 at 600,000 iterations and a random 16-byte per-vault salt. Use a fresh random 12-byte IV per encrypted object; keep unlocked keys in memory only. Do not store the passphrase.
- **Data and APIs:** On-device only, no telemetry or cloud upload. Use Mock Service Worker (MSW) for typed REST fixtures (`/trips`, `/checklists`, `/documents`, `/expenses`, `/nearby`, `/sos`, `/translate`).
- **Shared types:** `src/types/` owns Trip, Destination, Activity, ChecklistItem, Document, Expense, EmergencyProfile, and LocationShare contracts.
- **Authentication/authorization:** No account system. Require explicit browser permission for location/camera; location sharing is foreground and user initiated.
- **Deployment assumptions:** Static HTTPS hosting is required for secure-context APIs and service workers. No deployment target has been selected.
- **Testing tools and commands:** ESLint/Prettier, `tsc --noEmit`, Vitest, and Playwright. Expected scripts: `npm run lint`, `npm run type-check`, `npm run test`, `npm run build`, `npx playwright test`.

## Constraints and standards

- **Privacy/security:** Local-first storage, no telemetry, no external AI calls. Emergency profiles are informational only; no diagnosis or medical advice. SOS shows a local notification stub and user-controlled contact/call options; it does not dispatch emergency services.
- **Accessibility/platform:** Keyboard-accessible responsive PWA. Minimum browser baselines: Chrome/Edge 111, Safari 16.4, Firefox 128. Camera and geolocation denial must have usable fallbacks.
- **Offline/performance:** Cache the application shell and explicitly saved trip, document, emergency, and phrase data. Map tiles use a bundled fixture only; do not prefetch third-party tiles.
- **Licensing/dependencies:** No external map tile provider is included. Use lockfile-pinned dependencies and disclose limitations of mock data.
- **Design system/UI ownership:** Tailwind CSS 4 with feature-scoped components. The original Verifier/Finisher hit a provider quota; reassigned contributors and current ownership are recorded in `TASK_BOARD.md`.

## Team process

- **Project owner / decision authority:** User delegated the pending product and technical decisions to the Planner; the Orchestrator records accepted decisions. Implementation ownership changed after a provider quota failure; see the current task board for contributors and handoffs.
- **Team roles:** See `TEAM_ROLES.md` and accepted task ownership on `TASK_BOARD.md`.
- **Source plan:** See `source/README.md` and preserved original artifacts.
- **Custom instructions:** Keep original source artifacts unchanged. Treat map/weather/rate/translation/API data as mock fixtures until a separately approved provider is chosen.

## Open questions

- [ ] Verify supported mobile-browser OPFS quotas and file-size behavior during implementation.
- [ ] Accessibility review of the SOS flow before calling it production-ready.
- [ ] Map data/provider selection is outside this buildathon; current map is a local fixture.
