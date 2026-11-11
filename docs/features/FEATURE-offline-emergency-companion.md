# FEATURE-EC-001: Offline Emergency Companion – critical information accessible without internet

**Status:** Approved  
**Owner:** Verifier/Finisher agent  
**Priority:** P1  
**Last updated:** 2026-11-11  

## Traceability
- Source mind-map node(s): MM-001.6.1 Offline Emergency Companion
- Requirement ID(s): F-OEC-001
- Related decisions: TBD

## User need and outcome
Offline critical information: emergency steps, contacts, hospitals, safe routes, phrase generator — usable without internet.

## Scope
### Included
- Critical emergency info (SOS, contacts).
- Safe route recommendations.
- Phrase generator.

### Excluded
- Not yet implemented.

## User flow and states
- In crisis: show SOS button, nearest hospitals, emergency services, medical profile, lost items, safe routes, phrase generator.

## Acceptance criteria
- [ ] Given an emergency, when SOS button pressed, then alert + trusted contacts notified.
- [ ] Given a disaster, when safe routes recommended, then step-by-step help displayed.

## Data, privacy, and interfaces
- Inputs: emergency trigger, location.
- Outputs: alerts, shared location, contacts.
- Persistence: session logs.
- Privacy: local-only information; no emergency dispatch or external data transmission.

## Platform and accessibility
- Push notifications.
- Offline-first.

## Verification
- End-to-end SOS flow test.
- Legal review of sharing.

## Open questions
- [ ] Finalize legal/compliance review.
