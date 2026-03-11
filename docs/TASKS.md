# Remaining work

See `PHASES.md` for completed implementation phases and `VERIFICATION.md` for evidence. This backlog reflects the current repository state as of 2026-10-09.

## Active work

1. **Final visual acceptance** — all 18 captures exist at 1487×1058; finish the independent review and record any remaining material visual differences in `../design-qa.md`.
2. **Release preparation** — packaging, signing, and cross-platform validation are deferred by user request. Do not claim a distributable or support for Windows/Linux until those are completed.

The macOS source build and app launch are verified. The latest `npm run check` passes with 73 behavior tests, 0 failures, and 0 skips. Native catalog, library, planning, transfer and playback suites have passed. See `VERIFICATION.md`.

## Deferred by user request

- **Cross-platform packaging and validation** — Windows/Linux installers, OS-specific smoke tests, signing and publishing. Do not treat these as current blockers or as completed support claims.

## Out of current scope

- Castbox remote audio streaming, account/OAuth flows, cloud sync, social actions, media conversion and Android.

Every implementation item needs the relevant behavior checks and evidence. Do not mark visual acceptance complete from compilation alone.
