# Desktop visual QA — Phase 7

**Result: 18 implementation captures complete; visual acceptance failed on the latest independent review.**

## Capture method

Captured the fixture-backed desktop UI from the current production Vite build in a sandboxed Electron window with no preload bridge, so the prototype data is explicit and cannot be mistaken for native service data. Every image has a verified CSS viewport and PNG size of **1487×1058**, matching the 18 source images in [`design/DESKTOP_THEMES.md`](design/DESKTOP_THEMES.md). A single session held fixture content constant while switching Light and Dark. The reusable capture script is [`scripts/capture-phase7-visual.mjs`](scripts/capture-phase7-visual.mjs); image artifacts are in `artifacts/phase7-visual/` and excluded from Git.

The paired overview is [the contact sheet](artifacts/phase7-visual/paired-contact-sheet.png). Each full-size implementation image is named `<surface>-<theme>.png`.

## Screen matrix

| Surface | Reference pair | Captured state | Review |
| --- | --- | --- | --- |
| Find | `02-find-light` / `11-find-dark` | `coffee`, four channel results | Composition is close; live result names, artwork and counts differ from the reference fixture. |
| Channel | `01-channel-light` / `10-channel-dark` | Just Coffee & Me, three selected episodes | Cover now matches the isolated reference artwork; the fixture episode count and some row details still differ. |
| Downloads | `12-downloads-light` / `03-downloads-dark` | Fixture jobs with queued, active, completed and failed states | Content and row state/count differ from the reference; the dark reference has its known queued-check artifact. |
| Library | `04-library-light` / `13-library-dark` | Prototype downloaded tab and fixture file states | Row data and file-state details do not match the reference. |
| Settings | `05-settings-light` / `14-settings-dark` | Appearance selected; filename preview uses the canonical Almost sample | Theme, downloads, filename, preview and save controls now fit the reference viewport. Duplicate handling remains a select control, and typography/spacing still differ. Playback and Storage continue below the fold. |
| Bulk Review | `06-bulk-review-light` / `15-bulk-review-dark` | Three selected episodes and default review options | Dialog proportions are closer after widening; artwork, text and underlying page state differ. |
| Episode | `16-episode-desktop-light` / `17-episode-desktop-dark` | Almost, Just Coffee & Me | Cover now matches the isolated reference artwork; metadata and spacing still need review. |
| Expanded Player | `18-player-desktop-light` / `19-player-desktop-dark` | Almost near 0:56; downloaded state and sleep-timer menu open | Cover and track now match; playback position, metadata and composition are close, with remaining spacing and control differences. |
| Queue | `20-queue-desktop-light` / `21-queue-desktop-dark` | Almost current; four upcoming fixture entries | Current track and cover match; upcoming order, artwork and actions differ from the reference. |

The latest implementation screenshots were regenerated after correcting the Episode toast, Almost episode artwork, Bulk Review row sizing/order and several player/queue details. The matrix above documents fixture intent; the independent review of these exact captures still found material mismatches: Almost artwork differs on Channel, Library, Downloads and Queue; Channel mini-player is paused instead of playing; Bulk Review omits the host name, has denser rows, and uses the wrong Somewhere artwork; Expanded Player crops out the notebook and its feature/timer controls are undersized; Queue has the wrong card treatment, metadata, duration and player artwork. Settings, Downloads state/progress and Episode were considered aligned. See the latest captures under `artifacts/phase7-visual/`.

## Changes and runtime checks

- Bulk review width, Queue title/artwork scale, Find content width, Channel/Episode/Settings spacing, filename controls and save-row placement were tuned in the shared React components.
- The browser fixture's initial track and default filename preview now use the canonical Almost / `2026-10-06 - Almost.mp3` reference state.
- Native Settings identifies storage figures as examples and disables cache clearing because there is no native cache-clear service.
- `rtk proxy npm run check`: TypeScript, frontend/native builds, and all 71 behavior tests passed (0 failures, 0 skipped).
- Native Electron integration suites passed for catalog, library persistence, download planning, transfer pause/resume/recovery, and offline playback.
- `rtk proxy npm start` built the app and launched the production Electron window on macOS. The native accessibility tree showed live-catalog mode, persisted settings, and the disabled cache control.

## Remaining acceptance work

1. Resolve the specific visual mismatches above, regenerate all 18 captures, and obtain another independent review.
2. Cross-platform packaging and testing remain deferred by the user; this report only covers macOS execution and desktop fixture captures.
