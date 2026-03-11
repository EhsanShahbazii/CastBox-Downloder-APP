# Start here

This project was reset on 2026-10-08 at the user's request. The AI Studio frontend replaces all previous code. Read README.md, ARCHITECTURE.md, TASKS.md and RESET.md. Previous milestone completion claims are obsolete.

Preserve the supplied frontend's visual design. The first integration is deliberately limited to a native Electron shell and real settings persistence. Finish subsequent backend slices against the actual frontend types and callbacks. Never treat simulated progress as real downloads or playback.

Use `rtk proxy npm start` for Electron and `rtk proxy npm run dev:ui` for the browser prototype. Keep raw files.txt untouched and excluded.

Implementation is tracked phase by phase in PHASES.md. Phase 1 is verified: six catalog operations work anonymously through the production Electron bridge. See API_FEASIBILITY.md. Phase 2 screen integration is implemented. NativeApp and catalog/LiveCatalog reuse the original components with real metadata; App.tsx retains the browser prototype. Phase 3 saved-channel persistence is implemented. See PHASE3.md for SQLite architecture, tests and reserved media storage. Phase 4 safe file plans and native destinations are implemented; see PHASE4.md. Phase 5 real downloads and Phase 6 offline playback/queue are implemented and verified on macOS; see PHASE5.md and PHASE6.md. Phase 7 integration and visual acceptance remain.
