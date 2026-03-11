# Phase 3 — persistent library and saved channels

## Delivered

Electron now uses its bundled `node:sqlite` (verified Node 24.21.0, SQLite 3.53.4 on this macOS runtime). No dependency or native-addon rebuild was added. `desktop/library/store.ts` owns `library.sqlite` in the existing appData / Castbox Fresh profile, beside settings.json.

Migration 1 creates channels, episodes, saved_channels, playback_progress, listening_queue and download_queue. Migrations and multi-record mutations are transactional. Foreign keys, strict tables, JSON checks, a busy timeout, WAL and synchronous FULL are enabled. Reopening validates the version, integrity and required schema. Unknown, corrupt or newer-version databases are never silently reset. Close the app before preserving the database and any `-wal` / `-shm` companions for recovery; this phase does not introduce a repair or destructive reset action.

The narrow renderer bridge exposes only `library.read()` and `library.setSaved({channelId, saved})`. Main validates exact sender/main-frame identity and payload. New saves fetch canonical channel metadata through the existing anonymous catalog service; renderer metadata is never trusted. Writes are serialized, including the fetch, so queued save/unsave requests commit in arrival order. Repeated saves are idempotent and retain savedAt. Unsave removes only the bookmark, leaving metadata, progress and queue records intact. Already-saved channels can be read or unsaved without catalog access.

NativeApp loads the local library and displays loading/errors explicitly. Save/Unsave controls wait for commit, prevent repeat clicks, and show success only after a successful response. Failures retain prior state and offer Reload library. Library defaults to Saved Channels in native mode; its existing search, sort, pagination, cards, theme tokens and sticky navigation remain. View Channel opens the live channel screen with the saved state. The browser prototype remains independent.

## Foundation reserved for later phases

The store has tested internal methods for episode metadata, playback progress, ordered listening queues and separate planned download records. They are not exposed as renderer write operations: progress and download status must come from the real media/transfer services in Phases 5–6. Library downloaded/history tabs remain empty, and playback/download actions remain unavailable. No simulated records are inserted into the native database. Offline saved metadata is available; artwork is still a bounded network cache, not durable offline artwork.

The initial UI reads up to the saved-channel limit (5,000) and filters/pages locally. Larger libraries will need database-backed pagination. No cloud account state, sync, schema downgrade, auto-repair or filesystem deletion was added.

## Evidence

- Production build and strict TypeScript checks passed.
- 33 deterministic tests passed, zero skipped: duplicate saves, reopen, metadata retention on unsave, independent queues/progress, transaction rollback after a failed write, migration rollback, corrupt/newer/unknown database preservation, and strict renderer inputs, in addition to existing catalog/settings tests.
- `rtk proxy npm run test:library:native` passed: production preload and library IPC, save/unsave ordering, duplicate-save timestamp, invalid input, database close/reopen with a fresh renderer, Node isolation and rejection of another window's read/write requests. This uses explicit test catalog metadata and a temporary profile; production catalog integration is separately exercised through the real UI.
- macOS production UI: saved Coffee Break English, opened Library, quit the app fully, launched again, and verified the saved channel remained. View Channel routes back into the live catalog with Saved state intact. Unsave returns Library to its empty state; the test bookmark was removed. Light populated and dark empty Library screenshots were checked, and the light theme restored. Screenshots: `artifacts/phase3-library-*.jpg`.

These are functional and visual smoke checks, not independent pixel-parity acceptance or Windows/Linux execution claims. Next: Phase 4 native destination grants and safe file plans, before enabling transfers.
