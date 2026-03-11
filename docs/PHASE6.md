# Phase 6: local playback and listening queue

Phase 6 connects the supplied player and queue views to completed local downloads. The renderer uses one HTML audio element; audio bytes never cross IPC. The main process issues a short-lived opaque `castbox-media:` URL only for a verified completed transfer, then serves bounded byte ranges from the matching regular file. The file is opened without following symlinks and its device/inode and size are checked against the transfer record. Renderer calls remain named, typed, schema-validated and sender-validated.

Playback is offline and local. Playing from the live catalog succeeds only when that episode has a completed local download. Queue items are completed download job IDs; the durable queue and playback position are stored in SQLite v5. A queue survives restart and progress is saved during playback, on pause, and before window unload. Selecting a track restores its last saved position. The actual media duration is learned by the audio element and persisted so queue times match the downloaded file. The original bottom player, expanded player, and listening queue components are reused. Artwork uses the existing validated Castbox artwork bridge.

The existing controls now support play/pause, seeking, previous/next, skip intervals, volume/mute, playback speed, queue add/remove/reorder/undo/clear-upcoming, and sleep timer choices (15/30/60 minutes or end of episode). Auto-advance follows the saved `autoPlayNextInQueue` preference. Unknown episode durations remain unknown instead of being inferred from file size.

Verification on macOS:

- `rtk proxy npm run check` — production frontend/desktop builds and 68 behavior tests passed.
- `rtk proxy npm run test:playback:native` — native Electron decoded a local WAV via the custom scheme, sought, started playback, and persisted queue and progress through the actual preload bridge.
- `tests/playback.test.ts` — verified only completed local files get capabilities, byte-range responses, invalid capability denial, and queue/progress persistence after reopening SQLite.
- No `files.txt` credentials are used or changed.

This phase does not provide Castbox network streaming, media conversion, operating-system global media keys, or Android support. macOS native playback was exercised; Windows/Linux packages and their codec/file behavior still need OS testing. The downloaded-library/recently-played screens and screenshot comparison against all theme references remain part of Phase 7 integration and visual acceptance.
