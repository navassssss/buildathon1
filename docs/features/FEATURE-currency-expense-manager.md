# FEATURE-CEM-001: Currency & Expense Manager – conversion and expense tracking

**Status:** Approved  
**Owner:** Verifier/Finisher agent  
**Priority:** P0  
**Last updated:** 2026-11-11  

## Traceability
- Source mind-map node(s): MM-001.5.1.6
- Requirement ID(s): F-CEM-001
- Related decisions: TBD

## User need and outcome
Estimate transport, stay, food and other costs; convert currencies; track daily expenses; group shared expenses; budget monitoring; categorization; exchange rates.

## Scope
### Included
- Multi-currency converter.
- Daily expense tracker.
- Shared group expenses.
- Budget monitoring.
- Expense categorization.
- Currency exchange information.

### Excluded
- Not yet implemented.

## User flow and states
- Enter currency/amount → Convert; Log expense → Group with others → View budget summary.

## Acceptance criteria
- [ ] Given an amount in foreign currency, when converted, then equivalent in target currency is shown.
- [ ] Given an expense entry, when logged, then it appears in the tracker.

## Data, privacy, and interfaces
- Inputs: amounts, currencies, dates.
- Outputs: conversions from a bundled mock rate fixture and local expense records.
- Persistence: local DB.
- Privacy: local-only records; no payment-provider integration or cloud sync.

## Platform and accessibility
- Web app, responsive.
- Offline limited.

## Verification
- Unit tests for conversion math.
- Manual: verify FX rates, expense logging.

## Open questions
- [ ] Integration with payment providers.
