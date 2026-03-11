# Phase 2 — live catalog screen integration

## Implementation

Native Electron opens in Live catalog mode at Find. `NativeApp.tsx` owns the desktop shell and native settings. `catalog/LiveCatalog.tsx` owns search, navigation, channel paging, session selection and retry. The original `App.tsx` remains the explicit browser prototype; its timers and fixtures are never mounted in native mode.

Reused components: HeaderNav, SearchBar, RecentSearches, ChannelCard, ChannelSidebar, ChannelDetailsView, EpisodeRow, BulkSelectionBar, EpisodeDetailsView, ArtworkImage and BottomPlayer. Existing semantic CSS variables, typography, dimensions, theme selector and sticky header remain. Native Library/Downloads/Queue reuse empty original views with unavailable actions. The player remains idle.

- Search: real results, load-more pagination, session recent searches, explicit empty/loading/error/retry states.
- Full Castbox channel and episode page links resolve source IDs locally. Short links and other domains produce a clear validation error; no arbitrary URL fetch.
- Channel: real description/artwork, complete episode index, ten-item metadata pages, newest/oldest across the whole index. Text filtering is explicitly current-page only. Missing batch IDs are reported.
- Selection: individual, visible page, full channel, clear. Page changes and episode-detail back-navigation preserve selection. Changing channels resets it.
- Episode: fresh metadata, nullable date/duration/size, actual source availability, plain-text descriptions. No invented episode numbers, audio format or downloaded/queued state.
- Late responses cannot overwrite newer navigation or a cleared search. Leaving Find cancels UI ownership of pending requests. Transport itself is bounded by the existing native timeout; it is not aborted on navigation.
- Artwork: new typed IPC, sender validation, fixed HTTPS CDN allowlist (Castbox, observed Apple image hosts, assets.pippa.io), redirects refused, raster MIME only, 1 MiB cap, 8-second timeout, bounded renderer cache. Unsupported/missing images use neutral placeholders. No CSP expansion or direct renderer network access.

## Verification

`rtk proxy npm run check`: production build, strict TypeScript checks, 26 tests passed, zero skipped. Tests include input validation, error mappings, metadata units/nulls, link parsing, stale-response guard, pagination and artwork transport restrictions.

`rtk proxy npm run test:catalog:native`: 11 checks passed against real Electron production preload/IPC, including real artwork, unsafe artwork rejection, metadata operations, search pagination, Node isolation and untrusted sender denial.

Native UI exercised on macOS: coffee search (20 real results), opening Coffee Break English (95 episodes), selecting all 95, paging to items 11–20 with selection retained, opening fresh episode details, Download/Add to queue remaining unchanged with an availability message, direct channel and episode links, clear selection, rejection of non-Castbox links with a Retry control, real artwork and dark/light themes. Screenshots live in `artifacts/phase2-*.jpg`.

These are functional and visual smoke checks, not a pixel-perfect or independent visual acceptance claim. Real catalog content differs from the fixed reference artwork/copy. Full same-content, same-state comparison and independent acceptance remain Phase 7. Windows/Linux packaging and execution have not been tested.

## Next phase and limits

Phase 3: SQLite-backed catalog/library records, saved channels, separate queue records and reopen/recovery behavior. Reuse native components and replace unavailable callbacks; do not reintroduce the prototype state machine.

No real downloads/audio, durable search history or durable selection yet. No account/login flow, social writes, cloud sync, external artwork redirects, arbitrary CDN access, short-link resolver or cross-channel episode search. Native artwork failures do not block metadata. Browser preview retains fixture behavior for design reference.

Existing non-fatal Vite config and bundle-size warnings remain. No dependencies were added.
