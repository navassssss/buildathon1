# Task board

This is the shared development queue; it is intentionally independent of GitHub issues or project boards.

## Tasks

| Task ID | Requirement/spec | Task and completion criteria | Owner | Status | Dependencies | Updated |
|---|---|---|---|---|---|---|
| T-001 | F-STPL-001 Smart Trip Planner – create and manage trips | Build trip creation, editing, scheduling UI; API endpoints for destinations, dates, activities and schedules; cover happy path, empty state, error and recovery | Prior Feature Builder; integrated | Verified (prior report) | 20 unit/component tests reported; current integrated suite passes 23 files/219 tests; type-check/build pass | 2026-11-11 |
| T-002 | F-SMPK-001 Smart Packing Checklist – dynamic checklist | Build dynamic packing checklist covering destination, weather, duration and travel type; support add/remove items | Prior helper `ff5fa556` (provider errored) | Implemented; acceptance evidence pending | Focused tests reported; AC2 has explicit re-evaluate action, but automatic-on-change/manual flow and duplicate-store reconciliation remain unverified | 2026-11-11 |
| T-003 | F-DV-001 Document Vault – upload and organize documents | Secure upload, organize, search, retrieve; encrypt locally | `e45f100a` (OPFS storage handoff) | Implemented; browser QA pending | OPFS-first encrypted blobs with IndexedDB fallback; 30 focused tests pass; integrated 23 files/219 tests, type-check/build pass; real-browser OPFS/quota behavior unverified | 2026-11-11 |
| T-004 | F-NEB-001 Nearby Essentials – hospitals, pharmacies, ATMs and shops | Nearby service lookup with city fixtures, attraction filter and accessible local schematic map | `7496140a` | Implemented; browser permission QA pending | Local fixtures, manual fixture-city selection and SVG map; focused map/service tests pass; integrated suite 23/219, type-check/build pass | 2026-11-11 |
| T-005 | F-SOS-001 SOS + Location Sharing – emergency assistance | Emergency UI, country contacts, medical profile, hospitals, lost-item/person and safe-route hints | Module `7496140a`; integration `e45f100a` | Implemented; device QA pending | Local message drafts and user-controlled tel/mailto handoff; no dispatch/auto-send; user-triggered location snapshot; browser/device scenarios unverified | 2026-11-11 |
| T-006 | F-CEM-001 Currency & Expense Manager – conversion and expense tracking | Multi-currency converter, daily expense tracker, shared group expenses, budget monitoring and categories | Module `e45f100a`; integration `7496140a` | Implemented; integrated checks pass | Local deterministic FX fixture and Dexie expenses; full suite 23/219, type-check/build pass | 2026-11-11 |
| T-007 | F-ATA-001 AI Travel Assistant – context-aware travel chatbot | Contextual destination, trip plan and available resources assistant | Module `e45f100a`; integration `ff5fa556` | Implemented; integrated checks pass | Deterministic local/mock responses only; full suite 23/219, type-check/build pass | 2026-11-11 |
| T-008 | F-TL-001 Translation – text and camera translation | Text/voice/image mock translation, phrases, offline packs and emergency phrase generator | Module `e45f100a`; integration `ff5fa556` | Implemented with mock limits; integrated checks pass | Local bundled phrases/sample-caption fixtures; real OCR is not provided; full suite 23/219, type-check/build pass | 2026-11-11 |
| T-009 | F-OFF-001 Offline Mode – access saved essentials | App shell and saved local essentials accessible offline | Feature/config `7496140a`; integration `e45f100a` | Implemented; manual acceptance follow-up | `vite-plugin-pwa@1.3.0` same-origin shell cache; OfflineHub shows saved-place map/fixture fallback and local straight-line bearing/distance; no road/turn-by-turn routing; offline/install browser checks pending | 2026-11-11 |

## Handoff notes

- T-001–T-009 are integrated in `src/App.tsx`; integrated verification on 2026-11-11 passed 23 files/219 tests, type-check and production build. P0/P1 priorities and accepted stack are in `PROJECT_BRIEF.md`.
- T-002 AC2 evidence, T-005 snapshot/draft semantics, T-008 sample-only image captions and T-009 lack of authoritative routing are documented limits; see `PROJECT_STATE.md`.
- Remaining manual checks include browser offline reload/install/update, OPFS persistence/quota behavior, geolocation permission, clipboard and OS handoff. These are not claimed as verified.
- Dependencies follow the MVP buildathon scope hierarchy (P0 Core → P1 Secondary → P2 Later).
