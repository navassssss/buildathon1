# FEATURE-OFF-001: Offline Mode – access saved essentials

**Status:** Approved  
**Owner:** Feature/config `7496140a`; integration `e45f100a`  
**Priority:** P1  
**Last updated:** 2026-11-11  

## Traceability
- Source mind-map node(s): MM-001.5.2.3 Offline Mode
- Requirement ID(s): F-OFF-001
- Related decisions: D-20261111-buildathon-implementation

## User need and outcome
Access saved essentials (maps, documents, emergency info) without internet connectivity.

## Scope
### Included
- Offline maps and saved locations.
- Saved documents/maps/emergency info.

### Excluded
- Live map tiles, external routing/geocoding and cloud sync.

## User flow and states
- Turn off online mode → Load cached data → Use offline features.

## Acceptance criteria
- [ ] Given a saved or bundled fixture location, when the offline map is loaded, then places are displayed with schematic straight-line bearing/distance guidance; the UI clearly states this is not road or turn-by-turn navigation.
- [ ] Given a document, when opened offline, then it renders locally.

## Data, privacy, and interfaces
- Inputs: location, file selection.
- Outputs: offline view.
- Persistence: service-worker app shell cache plus explicitly saved local trip, document, emergency, and phrase data.
- Privacy: no external sync or third-party map tile requests.

## Platform and accessibility
- Works offline.
- Keyboard accessible.

## Verification
- Test offline load on restricted network.
- Verify no data leaves device.

## Open questions
- [ ] Determine offline storage limits.
