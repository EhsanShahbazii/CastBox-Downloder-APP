# Phase 5 — actual downloads, progress and recovery

Implemented and verified on macOS, 2026-10-08. Native UI follows the existing Downloads design in both themes. Playback remains Phase 6; Windows/Linux runtime and package validation remain Phase 8.

## User flow

Channel/Episode Download and bulk review use the Phase 4 filename preview. Queue downloads commits the reviewed plan and starts it. The Downloads screen shows real queued, active, paused, failed and completed jobs, actual byte progress and speed, pause/resume, pause all, cancel, retry and Show in folder. Unknown total sizes remain unknown until the response ends. Completed rows can be dismissed from history without deleting the audio. A failed row can retry after restoring the connection or destination.

After app restart, active jobs return paused. A user chooses the original folder through the OS picker before resuming. The app verifies the partial file against its saved byte count and SHA-256 checkpoint, asks for a fresh source, then resumes only when the server returns the expected byte range, strong ETag, source and redirect destination. If range support, validators or the source changes, it restarts the file. Existing destination files stay intact until a fully checked replacement is atomically placed. Cancellation removes only a partial file whose recorded identity still matches; completed audio remains in place.

## Implementation

- `desktop/downloads/engine.ts` controls a bounded queue (1–5), per-job abort signals, actual byte/speed snapshots, persistent state and restart handling. `desktop/downloads/transport.ts` resolves public DNS addresses and pins the connection, limits redirects and timeouts, refuses HTTPS downgrades and private/reserved addresses, sends no cookies/authentication, and accepts only audio/octet-stream responses.
- Source URLs are fetched from the canonical single-episode Castbox API in the main process. They never cross preload/IPC or appear in stored transfer records. Redirect target identity and strong ETags bind resume checkpoints; only valid Content-Range responses append bytes. Weak or missing validators cause a fresh transfer.
- Up to 8 GiB per episode is accepted. HTTP content lengths, identity encoding, response totals and actual bytes are bounded and checked. Supported extensions are mp3, m4a, aac, ogg, opus, wav and flac. Initial bytes must match the planned media format.
- Files are written to private, exclusive `.castbox-<job-id>.part` files with no-follow where supported. Checkpoints flush data, hash the saved prefix, and store identity/size/source/validator in SQLite. On restart, bytes beyond the last durable checkpoint are truncated only after the saved prefix is verified. Tampered files are preserved and not resumed.
- New destinations publish with an atomic no-overwrite hard link; replacement uses atomic rename only after the reviewed target identity is checked again. Completed output is synced on macOS/Linux. The database records a finalizing state so restart can recognize an already-published matching file and finish its record.
- SQLite v3 adds transfer_runs/jobs while preserving earlier data. Plan reservations release on completed/cancelled transfers. Retry of a plan ID cannot create a duplicate job batch. Jobs are persisted separately from listening history and downloaded-library playback integration.
- Transfers require a new session grant after restart. Source metadata is refreshed before each request. Raw URLs, cookies and auth headers are neither returned to the renderer nor stored in the database.

## Verification

- `rtk proxy npm run check`: TypeScript, production builds and 66 behavior tests passed, 0 failed/skipped.
- `rtk proxy npm run test:transfers:native`: real Electron sandbox/preload/IPC test paused a streamed file, closed and reopened the transfer service/database, required a new folder grant, resumed and verified completion. All seven transfer IPC actions from an untrusted window were denied; no Node globals or media URLs were exposed.
- Controlled local HTTP server tests cover bounded concurrency, idempotent batch start, actual output bytes, strong-ETag resume, servers ignoring ranges, 416 restart, changed validators/redirect destination, no strong ETag, bad Content-Range, unknown lengths, HTML/login bodies, truncation, pause-all, cancel, partial symlink/tamper checks, crash checkpoint recovery, finalization crash recovery, disk-full failure and safe overwrite behavior.
- Live UI used the saved Just Coffee & Me selection and native folder picker. Both real MP3s completed and persisted after app restart. ffprobe identified both as MP3 audio: 2,984,915 bytes / 186.43 sec and 2,914,356 bytes / 182.04 sec. Destination: `artifacts/phase4-destination/Just Coffee & Me/`. No credentials were used. Light/dark screenshots: `artifacts/phase5-downloads-light.jpg`, `artifacts/phase5-downloads-dark.jpg`.
- This is not an independent pixel-parity review and does not establish runtime support on Windows/Linux. Existing Vite `__dirname` and bundle-size notices remain unsuppressed.

## Limits carried forward

Node/Electron does not expose a portable directory-handle-relative atomic file API for every target OS. The implementation checks grant/root/parent identity and uses exclusive partial creation, no-follow opens, file identities, atomic placement, and rechecks during streaming. These checks reduce common path-swap risks, but cannot rule out every hostile local filesystem race between a path check and an OS path-based operation. Do not describe this as race-free. A native openat-style module or equivalent platform-specific implementation and tests are needed before making that stronger guarantee.

Size estimates for unknown-length media and free-space checks cannot guarantee available disk space during streaming. A late disk-full error preserves the checkpoint and reports failure. Plans containing blocked source metadata must be reviewed again. Castbox availability and public API compatibility may change. No OAuth, conversion, history POST, cloud sync or playback was added.
