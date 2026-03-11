# Phase 7: integration and design verification

Phase 7 connects the completed catalog, download, library, and playback flows while preserving the existing desktop UI and shared design tokens.

## Integration delivered

- The Library's downloaded list is derived from completed local transfers. Recently Played is derived from durable playback progress; current positions and known media durations are shown without fabricating unknown duration values.
- Library playback, resume, Play Next, Add to Queue, episode details, saved-channel latest episode playback, and file reveal use the existing typed catalog, playback, transfer, and native dialog/preload boundaries.
- File reveal invokes the operating system's Show in Folder action. Removing an item from the app library explicitly leaves its audio file on disk. Clearing listening history deletes playback history only and preserves the queue and downloaded audio.
- Playback snapshots refresh while Library is visible. If a saved media file is gone or changed, the player returns a generic safe error rather than exposing filesystem details.
- Shared content widths and Library layout were adjusted against the supplied desktop references. Remote artwork failures fall back to local artwork; no screenshot is used as an app background.

## Verification on macOS

- `rtk proxy npm run check` — TypeScript checks and production builds passed; 73 behavior tests passed, 0 failed or skipped (2026-10-09).
- `tests/playback.test.ts` covers durable recently played state, clearing history while preserving queue, and missing-file failure behavior.
- Native Electron live smoke: searched Castbox, opened a real channel and episode, reviewed and confirmed a native destination/file plan, downloaded the episode, saw transfer completion, and played the downloaded file locally. The playback duration was read from the actual audio element. The smoke used the project test destination under `artifacts/phase4-destination`; it did not write to the user's default Downloads folder.
- Native UI smoke: Library displayed completed transfers and recent playback from persisted data; the downloaded episode was played offline. Find was inspected in light theme after the latest build. Earlier native checks documented live catalog screens in both themes (`artifacts/phase2-*.jpg`), Downloads in both themes (`artifacts/phase5-downloads-*.jpg`), and Library in both themes (`artifacts/phase3-library-*.jpg`).
- `rtk proxy git diff --check` — no whitespace errors.

## Visual acceptance and limits

The design acceptance target is the 18 desktop references listed in `design/DESKTOP_THEMES.md`. The current Vite fixture build was captured in a sandboxed Electron window at the exact 1487×1058 viewport, and all 18 PNGs were saved under `artifacts/phase7-visual/`. The paired contact sheet and per-screen outcomes are in the root [design-qa.md](../design-qa.md).

All nine screens and both themes were recaptured at the same viewport. The independent review of the latest artifacts found material artwork, row, playback-state and layout mismatches; visual acceptance remains open. See `design-qa.md` for the exact findings.

Bulk Review width was increased to 760px, Queue heading/artwork scale was increased, Find content was widened to 1320px, and Channel/Episode/Settings layouts and theme tokens were adjusted. The Settings form now presents its filename format, extension, preview and save actions in the reference viewport, while leaving Playback and Storage available below. These changes are not evidence of pixel parity.

Native Settings now reports completed download bytes, actual destination-volume capacity, and Electron session cache size through typed storage IPC. Cache clearing uses the Electron API and preserves completed downloads.

Latest macOS verification: `rtk proxy npm run check` passed (73 behavior tests, 0 failures or skips; typechecks and builds passed). Native Electron suites for catalog, library, planning, transfers and playback all passed. `rtk proxy npm start` built and launched the production Electron app. See [verification](VERIFICATION.md) for evidence and limits.

This phase was exercised on macOS only. Windows/Linux native behavior, packaging, signing, and release acceptance are deferred by user request and remain Phase 8 work. Remote catalog data and artwork can change or be unavailable; unavailable artwork uses a neutral placeholder in the native app. The Library's remove action hides a completed transfer from the app and leaves its file on disk by design.
