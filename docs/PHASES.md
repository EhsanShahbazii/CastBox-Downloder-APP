# Desktop implementation phases

Working rule: implement and verify one phase at a time; preserve the AI Studio UI. A phase is complete only when its exit checks have evidence. No automatic promotion of simulated features to production.

| Phase | Scope | Exit checks | Status |
| --- | --- | --- | --- |
| 0 | Fresh foundation, secure Electron bridge, native settings | Build, persistence/error tests, native save/reload and folder dialog | Verified on macOS |
| 1 | Castbox catalog backend and access investigation | Fresh anonymous probes; normalized contracts; input/error/timeout tests; typed IPC; report unsupported operations explicitly | Verified: six operations, pagination, 50-item batch and native IPC on macOS |
| 2 | Connect Find, channel and episode pages | Real vs prototype modes explicit; search/navigation/pagination and stale-response handling; unchanged design | Implemented; functional checks on macOS, visual smoke checks (independent parity acceptance remains Phase 7) |
| 3 | Local library and progress persistence | SQLite migrations/reopen/recovery; saved channels and separate listening/download queues | Implemented and verified on macOS |
| 4 | Safe file plans and native destinations | Directory grants, safe names, duplicates, batch idempotency and failure tests | Implemented and verified on macOS |
| 5 | Real download engine and existing download UI | Bounded concurrency, pause/resume/cancel, range validation, disk errors, restart recovery and real file output | Implemented and verified on macOS with controlled HTTP server plus live Castbox MP3s; Windows/Linux pending |
| 6 | Real playback and queue | Audible playback, seek, offline source, speed/sleep timer and persisted progress | Implemented and verified with native Electron playback on macOS; Windows/Linux pending |
| 7 | Full integration and design verification | Search → download → offline play; failure cases; all nine screens in both themes | Core flow verified on macOS; 18 exact-size captures saved; visual acceptance remains open due content/artwork mismatches and pending second review |
| 8 | Desktop packaging and release preparation | Install/launch/data retention tested per OS; signing status explicit | Deferred by user request; not a current blocker |

Phase 1 creates the backend service boundary first. It does not replace fixture content in the UI until Phase 2. If anonymous API access cannot be established, mark that capability blocked with evidence and continue independent backend tests; never silently substitute mock responses.

Phase details: TASKS.md. Phase 1 evidence: API_FEASIBILITY.md. Current checks: VERIFICATION.md. Phase 5 implementation and evidence: PHASE5.md. Phase 7 implementation and evidence: PHASE7.md. Future work should update this table and evidence after each phase.
