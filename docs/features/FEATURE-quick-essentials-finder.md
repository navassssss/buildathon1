# FEATURE-QEF-001: Quick Essentials Finder – locate shops for urgently needed items

**Status:** Approved  
**Owner:** Verifier/Finisher agent  
**Priority:** P0  
**Last updated:** 2026-11-11  

## Traceability
- Source mind-map node(s): MM-001.3.5 Quick Essentials Finder
- Requirement ID(s): F-QEF-001
- Related decisions: TBD

## User need and outcome
Help travelers find nearby shops for urgently needed items (shops, stores).

## Scope
### Included
- Location-based shop lookup.

### Excluded
- Not yet implemented.

## User flow and states
- Enter location → Find nearby shops selling needed items.

## Acceptance criteria
- [ ] Given a city/location, when nearby shops are returned, then relevant shops are listed with addresses/contact.

## Data, privacy, and interfaces
- Inputs: location.
- Outputs: shop list.
- Persistence: none.
- Privacy: location shared only with consent.

## Platform and accessibility
- Local GeoJSON map and POI fixtures; browser geolocation is permission-gated.
- Offline limited.

## Verification
- Unit test for shop proximity query.
- Manual verification in different cities.

## Open questions
- [ ] Integrate point-of-interest APIs.
