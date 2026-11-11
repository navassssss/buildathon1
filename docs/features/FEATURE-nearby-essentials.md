# FEATURE-NEB-001: Nearby Essentials – hospitals, pharmacies, ATMs and shops

**Status:** Approved  
**Owner:** Feature module `7496140a`; see `TASK_BOARD.md`  
**Priority:** P0  
**Last updated:** 2026-11-11  

## Traceability
- Source mind-map node(s): MM-001.5.1.4
- Requirement ID(s): F-NEB-001
- Related decisions: D-20261111-buildathon-implementation

## User need and outcome
Help travelers find nearby hospitals, pharmacies, police stations, ATMs, restaurants, accommodation and tourist attractions.

## Scope
### Included
- Location-based essential services lookup.

### Excluded
- External POI/map APIs and authoritative road navigation.

## User flow and states
- Enter location → Get nearby hospitals/pharmacies/ATMs/shops/restaurants/attractions.

## Acceptance criteria
- [ ] Given a city/location, when nearby essentials are returned, then relevant facilities are listed with contact info.

## Data, privacy, and interfaces
- Inputs: location.
- Outputs: list of nearby facilities.
- Persistence: none.
- Privacy: location data shared only with trusted contacts.

## Platform and accessibility
- The selected mapping approach is local fixture data; the current implementation uses an accessible SVG schematic fallback rather than MapLibre. Browser geolocation is permission-gated; no external tile/API requests.
- Offline mode uses the bundled mock map fixture and local POI data.

## Verification
- Unit test for facility lookup.
- Manual verification in different cities.

## Open questions
- [ ] Integrate public transport and emergency services APIs.
