# Testing and verification standard

**Status:** Accepted for T-001–T-009 (2026-11-11)

## Project commands and targets

- Runtime: Node.js 24 LTS (minimum 22.12).
- Install/setup: `npm ci` (once a lockfile exists).
- Lint/format: `npm run lint` (ESLint; Prettier where configured).
- Type check: `npm run type-check` (`tsc --noEmit`).
- Unit/component tests: `npm run test` (Vitest).
- Integration/build: `npm run build`.
- End-to-end: `npx playwright test`.
- Run locally: use the package script documented in `package.json`.
- Supported browsers: Chrome/Edge 111+, Safari 16.4+, Firefox 128+; secure-context APIs and service worker require HTTPS outside localhost.

Do not report a command as passing unless it was actually run. If a command is unavailable, record that rather than inventing a replacement.

## Verification levels

Use the levels relevant to each change and state what was skipped:

1. Static checks: lint, formatting, type checks.
2. Unit/component checks: changed logic and user-visible states.
3. Integration checks: shared state, services, and feature boundaries.
4. Manual user flow: success, validation, loading, empty, error, and recovery behavior.
5. Platform checks: responsive behavior, accessibility, permissions, offline behavior, install/update lifecycle, or browser APIs as applicable.

## Test design and safety

- Derive checks from approved acceptance criteria.
- Cover negative/failure paths as well as the happy path.
- Use synthetic data and non-production credentials.
- Report exact command, result, and relevant environment.
- Never make external tile, AI, emergency-dispatch, or personal-data API calls in tests; use local fixtures and mocks.

## Handoff evidence template

```text
Task/requirement IDs:
Commands actually run and results:
Manual scenarios and environment:
Acceptance criteria verified:
Not verified / reason:
Open failures or follow-up:
```

## Run results

**Integrated verification (2026-11-11, Node 26.13.0):**

- `npm run test` — PASS, 23 test files / 219 tests.
- `npm run type-check` — PASS (`tsc --noEmit`).
- `npm run build` — PASS (`tsc && vite build`); PWA 1.3.0 generated `dist/sw.js` and Workbox assets with five same-origin precache entries (598.03 KiB).
- Build warning: main JavaScript bundle is 555.56 kB minified (157.19 kB gzip), above Vite's 500 kB advisory threshold.
- `npm run lint` — unavailable; `package.json` has no lint script.
- Manual browser/device checks were not run: service-worker offline reload/update/install lifecycle, cache quota/eviction, OPFS persistence and quotas, geolocation permission, clipboard, and OS tel/mail handoff.

T-003 focused verification after OPFS work: `npx vitest run src/services/encryption.test.ts src/services/documentStorage.test.ts src/stores/documentStore.test.ts` — PASS, 3 files / 30 tests. T-004/T-009 map-focused verification: 4 files / 47 tests passed. These focused results are agent-reported; the integrated full-suite result above was rerun from the workspace.
