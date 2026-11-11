# FEATURE-TL-001: Translation – text and camera translation

**Status:** Approved  
**Owner:** Verifier/Finisher agent  
**Priority:** P1  
**Last updated:** 2026-11-11  

## Traceability
- Source mind-map node(s): MM-001.2.3 Language Assistance
- Requirement ID(s): F-TL-001
- Related decisions: TBD

## User need and outcome
Provide text translation, voice translation, camera-based translation of signs/menus, common local phrases, offline packs, emergency phrase generator.

## Scope
### Included
- Text translation.
- Voice translation.
- Camera-based sign/menu translation.
- Local phrases.
- Offline translation packs.
- Emergency phrase generation.

### Excluded
- Not yet implemented.

## User flow and states
- Select language → Translate text/voice/camera content → Save pack/phrases.

## Acceptance criteria
- [ ] Given source text, when translated, then correct output is shown.
- [ ] Given an image, when translated, then captioned text appears.

## Data, privacy, and interfaces
- Inputs: text, audio, images.
- Outputs: translations.
- Persistence: bundled phrase pack and local saved selections.
- Privacy: mock translation only; text/audio/image data is not sent to an external provider.

## Platform and accessibility
- Web interface with camera input.
- Offline packs downloadable.

## Verification
- Unit tests for each translation type.
- Manual review of generated phrases.

## Open questions
- [ ] Integrate camera API.
