# Verification — current macOS evidence, 2026-10-09

## Automated checks

- `rtk proxy npm run check` — both TypeScript checks, frontend and desktop production builds passed; 73 behavior tests passed, 0 failed, 0 skipped (2026-10-09).
- `rtk proxy npm run test:catalog:native` — trusted live catalog calls, artwork validation, input rejection, Node isolation and untrusted-window denial passed.
- `rtk proxy npm run test:library:native` — initial/reopened SQLite state, save/unsave, validation, persistence and untrusted IPC denial passed.
- `rtk proxy npm run test:planning:native` — native directory grant, traversal rejection, plan persistence/idempotency and untrusted IPC denials passed.
- `rtk proxy npm run test:transfers:native` — pause/checkpoint/reopen/resume, completion bytes, fresh grant requirement and seven untrusted IPC denials passed.
- `rtk proxy npm run test:playback:native` — native offline playback harness passed.

## Native app launch

- `rtk proxy npm start` built and launched the production Electron app from the local Vite output on macOS. Electron was confirmed running after the latest build.
- Prior Phase 7 live smoke completed a real catalog search, native destination review, download, and local offline playback using a project test destination. It did not write to the user's default Downloads folder.
- Native Settings persists user settings and reports actual destination volume capacity, completed transfer bytes, and Electron cache usage. Clearing the Electron cache preserves downloaded files. The app does not claim Castbox login, cloud sync, or remote streaming.

## Visual evidence

- All nine desktop screens in both themes are saved in `artifacts/phase7-visual/` at 1487×1058 (18 PNGs). The capture script passed. Independent review found remaining material mismatches; capture success is not visual acceptance. See `../design-qa.md`.
- `scripts/capture-phase7-visual.mjs` reproduces the fixture screenshot set. Its Electron renderer has no preload bridge and is separate from the native production screen.

## Limits and advisories

- Windows/Linux packaging and execution, signing, and release acceptance are deferred by the user and have not been tested. Current verified runnable target is macOS.
- Google Fonts remain remote. Vite reports an existing `__dirname` configuration advisory and a frontend bundle above 500 kB. These warnings were not suppressed.
- Visual reference images are not used as application backgrounds. The prototype and native product use their own artwork data; some artwork differs from the design references.
- `files.txt` remains excluded from Git and was not read or altered for these checks.
