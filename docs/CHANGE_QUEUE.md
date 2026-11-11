# Live change queue

Use this queue for meaningful suggestions, corrections, and new decisions raised while work is active. The orchestrator owns triage and updates approved docs/tasks after the required approval.

Classifications: `Clarification`, `In-scope change`, `New scope`, `Priority change`, `Shared contract/architecture`, `Bug`, `Deferred idea`.

Statuses: `Proposed`, `Needs decision`, `Accepted`, `Rejected`, `Deferred`, `Applied`.

| Change ID | Date/source | Request                                                              | Classification  | Affected requirement/task | Decision/status                                                             | Active-work action                                          | Resolution                                                                       |
| --------- | ----------- | -------------------------------------------------------------------- | --------------- | ------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| T-001     | 2026-11-11  | Create Smart Trip Planner spec & implement (FEATURE-SMTPL-001)       | In-scope change | F-STPL-001 / T-001        | Prior Feature Builder implementation recorded Verified                      | Approved by user; Planner decisions integrated              | Verified per prior task report; exact check evidence is in project state         |
| T-002     | 2026-11-11  | Create Smart Packing Checklist spec & implement (FEATURE-SMPK-001)   | In-scope change | F-SMPK-001 / T-002        | Integrated; AC2 re-evaluation/manual evidence remains open                  | Approved; Dexie persistence accepted                        | Focused tests reported; see `PROJECT_STATE.md` for AC2 evidence gap              |
| T-003     | 2026-11-11  | Create Document Vault spec & implement (FEATURE-DV-001)              | In-scope change | F-DV-001 / T-003          | Integrated; OPFS-first storage added by `e45f100a`                           | Approved; OPFS with IndexedDB fallback                      | 30 focused tests; current integrated suite/type-check/build pass; browser quota QA pending |
| T-004     | 2026-11-11  | Create Nearby Essentials spec & implement (FEATURE-NEB-001)          | In-scope change | F-NEB-001 / T-004         | Integrated; local map/attraction/manual city support added by `7496140a`    | Approved; local fixtures only                              | 47 focused tests; current integrated suite/type-check/build pass                |
| T-005     | 2026-11-11  | Create SOS + Location Sharing spec & implement (FEATURE-SOS-001)     | In-scope change | F-SOS-001 / T-005         | Integrated by `e45f100a`                                                     | Approved; local draft/no dispatch constraint                | Integrated suite passes; snapshot/draft and device handoff limits documented    |
| T-006     | 2026-11-11  | Create Currency & Expense Manager spec & implement (FEATURE-CEM-001) | In-scope change | F-CEM-001 / T-006         | Integrated in `App.tsx`                                                      | Approved; local mock FX fixtures                            | Current integrated suite/type-check/build pass                                   |
| T-007     | 2026-11-11  | Create AI Travel Assistant spec & implement (FEATURE-ATA-001)        | In-scope change | F-ATA-001 / T-007         | Integrated in `App.tsx`                                                      | Approved; deterministic local assistant                     | Current integrated suite/type-check/build pass                                   |
| T-008     | 2026-11-11  | Create Translation spec & implement (FEATURE-TL-001)                 | In-scope change | F-TL-001 / T-008          | Integrated in `App.tsx`                                                      | Approved; local phrase/sample-caption fixtures              | Current integrated suite/type-check/build pass; no general OCR                  |
| T-009     | 2026-11-11  | Create Offline Mode spec & implement (FEATURE-OFF-001)               | In-scope change | F-OFF-001 / T-009         | Integrated; PWA config by `7496140a`, App by `e45f100a`                      | Approved; same-origin shell cache and local map             | Current integrated suite/type-check/build pass; schematic bearing only (no turn-by-turn); manual browser QA remains |

## Handoff notes

- Tasks T-001–T-009 are approved and integrated. Current statuses, check counts and acceptance limits are in `TASK_BOARD.md` and `PROJECT_STATE.md`; previous agent ownership notes below are historical only.
- Dependencies follow the MVP buildathon hierarchy (P0 Core → P1 Secondary → P2 Later).
- The final integrated run on 2026-11-11 passed 23 test files / 219 tests, type-check and production build. No browser/device walkthroughs were run.
- Mind-map source file kept read-only at `/home/afeej/.paseo/uploads/upload_590b46f9-bd74-4ea8-ae97-9bff48bd00c5/travellers_needs_mindmap.opml`.

## Planner decisions integrated

- The user approved all tasks T-001–T-009 and delegated pending project decisions to the Planner. The Verifier/Finisher quota error led to reassignment; the final implementation is integrated by contributors recorded in `TASK_BOARD.md`.
- Repeated source occurrences for Smart Trip Planner, Smart Packing Checklist, Document Vault, SOS, Quick Essentials Finder, Travel Journal, and AI Travel Assistant are merged under their existing requirement IDs with every source node retained in `FEATURE_INDEX.md`.
- ID collisions are resolved: Offline Emergency Companion is F-OEC-001; Common local phrases is F-PHR-001; Translation umbrella is F-TL-001 and Text translation remains F-TL-002.
- Task priorities: T-001–T-006 P0; T-007–T-009 P1. Non-task Travel Journal and Local Culture Guide remain Proposed/out of scope.
- Buildathon maps, nearby POIs, weather, exchange rates, translation, and AI use local mock fixtures. No external tile, AI, or data-provider calls.

## Reconciliation corrections applied

- Moved the 14 draft feature specs into `docs/features/` and renamed them to the documented `FEATURE-<short-kebab-name>.md` pattern.
- Marked task-linked specs and requirements Approved; non-task feature ideas remain Proposed. Priorities in the index are approved only for T-001–T-009 scope.
- Corrected source-node mappings, merged repeated source occurrences, and removed all duplicate requirement IDs without changing the preserved source transcription.
- Updated project brief, task board, decisions, and codebase map with the accepted stack and implementation ownership.
