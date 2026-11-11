# Traveller Companion

Offline-first travel planning and trip assistance PWA built with React, TypeScript and Vite.

## Run locally

Requires Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run test
npm run type-check
npm run build
```

There is currently no `lint` script. See [`docs/TESTING_STANDARD.md`](docs/TESTING_STANDARD.md) for verification details and manual browser checks.

## Features

- Trip planning and packing checklist
- Encrypted document vault using OPFS when available and IndexedDB fallback
- Nearby essentials with bundled fixture cities and a schematic local map
- Emergency information and user-controlled SOS message drafts
- Expense tracking and deterministic mock currency conversion
- Local travel assistant and bundled translation/phrase examples
- PWA app-shell caching and offline readiness information

The app uses local fixtures for map places, exchange rates, assistant responses and translation examples. The map is schematic, SOS does not dispatch or automatically notify contacts, and camera translation uses sample captions rather than general OCR. It does not include cloud sync, telemetry, external map tiles or live AI services.
