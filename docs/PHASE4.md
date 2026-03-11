# Phase 4 — safe file plans and native destinations

Implemented on macOS, 2026-10-08. No audio transfers or destination file writes occur in this phase.

## User flow

Channel and Episode download actions open native review. Bulk review receives every selected ID, including off-page selections. Choose a folder through the OS dialog, configure the filename template, channel grouping, duplicate policy and concurrency, then review canonical filenames before saving. Cancel preserves selection; cancelling the folder picker preserves the previous choice. Configuration changes invalidate the preview. Missing episodes or unknown source formats block saving with an explicit explanation.

Saved plans appear separately above Downloads and persist in SQLite. They are marked Planned, never downloading or completed. Settings and Downloads use the same native chooser. Remembered settings paths are preferences; a review still needs an opaque native grant. The two-episode verification plan was later run during Phase 5. Its real MP3 outputs and validation are recorded in PHASE5.md.

## Backend and contract

- shared/downloads.ts defines strict inputs and named preload methods: chooseDirectory, prepare, commit, list.
- desktop/downloads/ipc.ts enforces the existing trusted sender and exact main-frame URL restrictions. Renderer-supplied absolute paths, metadata and media URLs cannot authorize a plan.
- DirectoryGrants canonicalizes the native folder, checks directory identity and access, and issues a bounded session-only grant. Grants and drafts are revoked on window close.
- DownloadPlanner fetches canonical metadata in batches of 50, supports 1–1000 unique selected IDs, and retains source extensions (.mp3, .m4a, .aac, .ogg, .opus, .wav, .flac). No conversion or guessed MP3 format.
- Filename tokens: {channel}, {title}, {date}, {eid}. Metadata is sanitized for reserved characters, Windows device names, trailing dots/spaces and byte limits. Relative templates reject traversal and absolute paths. Conservative NFC/case comparison applies across operating systems.
- Preflight rejects symlink components, hard-linked targets, directory/file conflicts, and parent/child conflicts with other reservations. Skip, rename and replace decisions are shown explicitly. Replacement is only planned.
- Drafts expire after 15 minutes, with at most 20 retained drafts and 64 grants. Saving accepts only the draft ID, rechecks the folder, path snapshots and known disk requirements, and uses transactional unique filename reservations. Retrying a saved ID is idempotent. Renderer mutation of a returned preview cannot alter the main-owned draft.
- SQLite migration v1 → v2 adds file_plans and file_reservations while preserving saved channels and other library records. Phase 5 adds transfer tables in v3. The latest 100 plans are displayed. Reservations persist; plan cancellation/removal and transfer lifecycle integration belong to Phase 5.

## Verification

- npm run check: both TypeScript checks, production builds and 43 deterministic tests passed; 0 failed or skipped.
- npm run test:planning:native: production preload and planning IPC in a sandboxed Electron renderer passed initial and reopened-store checks, idempotent commit, traversal rejection, Node isolation and three untrusted-window denials. This suite uses an explicit test catalog and temporary destination, not live network data or the OS picker.
- Separate native UI check used the real Just Coffee & Me catalog: selected two episodes, cancelled and reopened the real macOS picker, chose an isolated directory, reviewed actual MP3 filenames and 5.6 MB known size, and saved the plan. The destination remained empty. Reloading the renderer displayed the saved plan. Automated native reopen covers database restart persistence.
- Visual smoke checking caught and fixed long-destination overflow and stale prototype selection IDs. Final build passed. Evidence: artifacts/phase4-saved-plan.jpg. No independent pixel-parity acceptance is claimed.
- Deterministic failures cover forged/expired/revoked grants, destination swaps, traversal, symlinks, hardlinks, case collisions, concurrent reservations, unknown media formats, insufficient known free space, and preserving existing file contents.

## Phase 5 requirements

These are read-only preflight checks, not race-free permission to write later. Before transfer, regrant destinations after restart and revalidate persisted plans, canonical media sources, redirects, and filesystem state. Implement safe exclusive temporary-file creation and atomic final placement, including replacement consent/state checks and protection against filesystem changes between checks and writes. Never trust a stored path merely because Phase 4 accepted it.

Add reservation release/cancellation, bounded concurrency, actual byte progress, pause/resume/cancel, Range/ETag validation, disk-full and failed-write handling, restart recovery, and controlled HTTP-server integration tests. Unknown sizes remain unknown; free-space preflight cannot guarantee transfer completion. No audio playback, signing, installers or Windows/Linux runtime verification is included here. Existing Vite config/chunk advisories remain visible.
