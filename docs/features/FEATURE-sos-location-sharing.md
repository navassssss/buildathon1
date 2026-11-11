# FEATURE-SOS-001: SOS + Location Sharing – emergency assistance

**Status:** Approved  
**Owner:** Feature module `7496140a`; App integration `e45f100a`  
**Priority:** P0  
**Last updated:** 2026-11-11  

## Traceability
- Source mind-map node(s): MM-001.5.1.5
- Requirement ID(s): F-SOS-001
- Related decisions: D-20261111-buildathon-implementation

## User need and outcome
Enable a user-triggered emergency flow with a current-location snapshot, country-specific contact info, hospital/emergency services, medical profile, lost-person/lost-item and schematic safe-route hints.

## Scope
### Included
- Emergency alert & SOS button.
- User-triggered location snapshot and shareable contact drafts.
- Country-specific emergency contacts.
- Hospital/emergency services info.
- Medical profile/allergies.
- Lost item reporting.
- Safe route recommendations.

### Excluded
- Automatic message sending, continuous background tracking and real emergency dispatch.

## User flow and states
- Trigger SOS → Prepare a local alert/message draft → Offer user-controlled contact/call options → Show nearby help and informational medical profile.

## Acceptance criteria
- [ ] Given an emergency, when the SOS button is pressed, then a local alert/message draft is prepared and user-controlled contact options are shown; the app does not automatically send or dispatch.
- [ ] Given a location, when shared, then nearby hospitals/emergency services are displayed.

## Data, privacy, and interfaces
- Inputs: emergency trigger, location.
- Outputs: alerts, shared location, contact info.
- Persistence: session logs.
- Privacy: user-initiated foreground location only; medical profile stays local and is informational, with no diagnosis or medical advice.

## Platform and accessibility
- On-device notification stub only; no real dispatch or external emergency calls.
- Offline guidance available.

## Verification
- End-to-end test of SOS flow.
- Review safety/legal implications.

## Open questions
- [ ] Legal review of emergency sharing.
