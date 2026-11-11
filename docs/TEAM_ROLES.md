# Team roles and ownership

**Status:** Work assignments reflect the user's latest instruction to distribute remaining features across available agents; other team memberships remain TBD.

| Member/role | Owned feature IDs | Files/components primarily owned | Shared interfaces to coordinate | Reviewer |
|---|---|---|---|---|
| Project owner/orchestrator | Cross-project planning and docs | `docs/` canonical records | All cross-cutting decisions | Team |
| Feature Builder (legacy T-001 owner) | T-001 | Trip planner source and tests | Shared trip types and storage | Orchestrator |
| Helper agent `ff5fa556-3e67-401f-85e8-4147d0265f3a` (user-approved recovery owner) | Shared App integration for T-004–T-008 | Shared app shell and integration | Integrate feature modules from owners; avoid their isolated files | Orchestrator |
| Helper agent `be100f56-b3b7-47c6-bf6f-60132a0d78bb` | T-005 SOS + Location Sharing | Isolated SOS UI/service/tests | Existing location service and emergency shared types, read-only | Orchestrator |
| Helper agent `e45f100a-d54c-41d2-99c1-97bc295eea5e` (`opencode/iceman-free`) | T-006 Currency & Expense Manager; T-007 AI Travel Assistant; T-008 Translation module | Isolated feature UI/service/fixtures/tests | Existing shared types/DB read-only; primary helper integrates app | Orchestrator |
| OpenCode Project Orchestrator `4766b5b2-97c7-43d8-8c84-e7d0e921aef7` | T-009 Offline Mode | PWA/service-worker and isolated offline hub modules | Coordinate App integration with primary helper | Parent Orchestrator |
| Planner agent `0b291b3c-74ac-4749-b9f5-ed4d75250d18` | T-009 acceptance/review checklist | Read-only checklist and test scenarios | Primary helper consumes recommendations | Orchestrator |
| Reviewer agent `8e51cfd5-7bd3-4ee0-b132-04bf02cc94e9` | T-003/T-008 security review; final T-001–T-009 regression after integration | Read-only findings and exact check results | Runs checks after primary helper reports integration complete; reports manual offline scenarios not covered | Orchestrator |
| Member 1 | TBD | TBD | TBD | TBD |
| Member 2 | TBD | TBD | TBD | TBD |
| Member 3 | TBD | TBD | TBD | TBD |

## Ownership rules

- Each task has one accountable owner. Other agents may review or pair but coordinate before editing the same files.
- UI/design ownership and backend/shared-state ownership must be explicit where the team has separate responsibilities.
- Shared interface changes require a decision record or explicit team confirmation before dependent features implement against them.
- T-005–T-009 owners and review assignments reflect the user's latest instruction to distribute work across available agents. The Verifier/Finisher remains blocked by provider quota. Other member placeholders remain unassigned.
