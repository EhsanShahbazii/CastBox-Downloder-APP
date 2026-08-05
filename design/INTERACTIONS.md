# Screen behavior and design handoff

These notes refine DESIGN_BRIEF.md after the user selected the second visual direction and requested all primary pages and details. Current deliverable is images, not code. Do not re-run three-way visual exploration. Preserve the selected warm editorial identity.

## Shared controls

- Desktop header: Find, Library, Downloads with active-transfer count, Settings, and a visible Theme button. Active destination has an underline plus color. Narrow windows must collapse navigation without overlap.
- Theme button opens Light / Dark / System; selection applies immediately and persists locally in the future prototype. System follows the OS. The Settings appearance control changes the same state. Escape and outside click close menus; return focus to trigger. Android uses a theme sheet instead of a tiny desktop popover.
- Theme is available on detail/player screens too. Every page must eventually have both theme mappings; the images show representative variants, not every combination.
- Player remains independent of download actions. Clicking artwork/title opens Now Playing; queue button opens listening queue. A collapsed mobile player sits above bottom navigation. Expanded player replaces both to avoid duplicate playback controls.
- Keyboard: Tab order follows layout; Enter/Space activate controls; Escape closes overlays. Sliders have accessible names, values, and keyboard adjustment. Use text labels or tooltips for icon actions. Android touch targets at least 48dp.

## Screen contracts

| Surface | Main interactions | Additional states to implement |
| --- | --- | --- |
| Find | Enter query or supported link; clear query; submit; choose channel result; remove recent searches | First use, suggestions, resolving link, loading, no results, unsupported link, offline, access required |
| Channel | Save/unsave locally; filter episode titles; sort; play row; single download; multi-select; open episode details | Skeleton, empty channel/filter, selection retained across pages, unavailable episode |
| Bulk review | Review count/size; change destination; edit filename format; choose concurrency; skip duplicates; queue or cancel | Existing files, unknown size, invalid template, permission failure, insufficient space |
| Downloads | Filter by status; pause/resume one/all; change concurrency; retry; cancel; show completed file | Waiting for network, unsupported resume, partial batch failure, all complete, empty queue |
| Library | Filter local episodes; saved channels; recently played; resume; play next; show/export file; remove download | Empty library, missing local file, offline, delete confirmation |
| Settings | Theme; concurrency; folder; grouping; duplicates; filename tokens and preview | Dirty/saved settings, invalid filename token, reset confirmation, Android managed-storage/export alternative |
| Episode | Back; play; download; add to listening queue; channel link; expand description | Already downloaded, unavailable source, missing art, long mixed-direction title |
| Now Playing | Collapse; seek; skip -15/+30; previous/next; pause; speed; sleep timer; episode details | Buffering, paused, ended, unavailable, streaming vs local source |
| Listening queue | Play now; drag reorder; accessible move up/down; remove; clear upcoming; find more | Empty queue, disabled boundary moves, clear confirmation, undo removal |

## Detailed overlays

- Playback speed: 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, 2×; selected value indicated with text/check. Apply immediately.
- Sleep timer: Off, 15 min, 30 min, 60 min, End of episode; active countdown with Cancel timer. Do not confuse the moon timer icon with the labeled Theme control.
- Remove download confirmation: name, file size, “Deletes the audio from this device. Your listening progress is kept.” Cancel / Remove download. Saved-channel removal must not implicitly delete files.
- Cancel active transfer: explain partial-file deletion or retention; do not pause audio.
- Clear listening queue: removes upcoming items only, current playback continues. Offer confirmation and undo where possible.
- Filename template: validate tokens {channel}, {title}, {date}, {eid}; source extension fixed, live preview, no unsupported format conversion. Unknown token produces inline error and disables Save/Queue until corrected.
- Selection: first “Select this page”; then explicit “Select all 280 episodes” when full matching IDs are known. Review snapshot freezes selected IDs. Cancel preserves selection. Filter changes must not silently change the selected set.
- Concurrency values 1–5; 1 is sequential. Lowering the limit does not cancel active transfers. Queue only starts additional transfers once under the new limit.
- Missing file: Locate file or Download again on desktop; Re-download on Android. Offline remote failures never block local playback.

## Proposed tokens for frontend translation

These values are starting specifications derived from the chosen visual direction, not sampled or contrast-certified from raster pixels. Validate contrast during implementation.

| Semantic role | Light | Dark |
| --- | --- | --- |
| Canvas | #FAF7F1 | #211C19 |
| Subtle surface | #F1EBE3 | #2C2520 |
| Raised surface | #FFFCF7 | #352D27 |
| Primary text | #291A14 | #FAF2E6 |
| Secondary text | #706158 | #C5B6A8 |
| Divider | #DED3C7 | #51443A |
| Primary action | #B84316 | #D65B23 |
| On primary | #FFFFFF | #FFFFFF |
| Focus ring | #803B19 | #FFC18A |

- Editorial serif only for page/channel headings; body and control typography use a legible sans-serif. Candidate families: Libre Baskerville and Inter, with system fallbacks. Verify licenses before bundling.
- Body 14–16px, metadata 13–14px, desktop page title 36–44px, mobile page title 28–32px; do not blindly scale the generated raster’s oversized text.
- Spacing 4/8/12/16/24/32/48; modest 8px control radius; larger 12px dialog/artwork radius. Use restrained elevation for overlays only.
- Motion 120–180ms for feedback; respect reduced motion. Selection, download, error and disabled states must not rely on color alone.

## Visual QA notes and corrections before coding

The nine generated images are design references, not pixel-perfect component specifications. Apply these explicit corrections rather than reproducing artifacts:

1. Downloads: queued item incorrectly has a green completed check. Replace with neutral clock; completed alone receives a success check. Queued state must be visibly distinct.
2. Metadata is illustrative and varies between images (artist attribution, artwork, dates, duration, size, channel names). Use one canonical mock dataset in frontend code. Do not treat generated titles/authors as verified Castbox metadata. The actual supplied Almost sample is 186000 ms and 2984915 bytes; decide consistently whether demo data uses that sample or labeled fictional fixtures.
3. Bulk dialog: generated Somewhere artwork does not match its earlier row. Use the same episode artwork everywhere.
4. Player icons differ in some generated backgrounds. Standardize on previous, -15s, play/pause, +30s, next. Do not add shuffle/repeat merely because ImageGen inserted them.
5. Settings side navigation should be anchor links to sections in the illustrated unified form; highlight the visible section. Playback/storage sections need their own content further down, not dead links. Theme applies immediately; other settings use Save changes. Avoid implying theme waits for Save.
6. Preserve a route back to Find and global search from channel detail; the revised image emphasizes channel search and omits the original global field. Navigation is sufficient if clicking Find retains the last global query.
7. Downloads selection boxes are optional. Remove them unless batch actions are present and scoped to selected items; Pause all remains unambiguous.
8. Mobile title/artwork proportions and menu width must be adjusted at real 390px CSS width. Verify no clipped labels at 360px or enlarged text. Full image resolution is not the CSS viewport size.
9. Theme icon should reflect active mode and expose an accessible name. “Select all” stays usable when appropriate; muted appearance in the channel image must not imply accidentally disabled behavior.

## Current desktop coverage

The desktop-only expansion is indexed in DESKTOP_THEMES.md: nine primary desktop surfaces each have a light and dark reference (18 total). Existing mobile images are unchanged. Full desktop Now Playing has no bottom mini-player; Episode Details and Listening Queue retain it. Preserve the new light Downloads neutral queued clock in both themes. Theme pairs should share component geometry; do not duplicate implementations.

## Original collection coverage limits

SCREENS.md contains nine primary screen images: six desktop and three Android. Offline Library and failed download examples are illustrated; most loading, empty, permissions, deletion and authentication states are specified above but not separately rendered. Each page in both themes and every Android adaptation remains part of frontend implementation, not a claim about this image set. The images contain no backend code or real download/player functionality.
