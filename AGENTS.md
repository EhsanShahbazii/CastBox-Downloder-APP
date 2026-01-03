# Project instructions for all agents

Read `docs/START_HERE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, and your task dependencies before editing. User requirement: prefix every shell command with `rtk`; use `rtk proxy <command>` for commands without an optimized wrapper. Local user reference: `/Users/ehsan/.codex/RTK.md`.

## Product and design constraints

- Desktop first: macOS, Windows, Linux. React + TypeScript renderer, TypeScript Electron local backend. No Android work in this campaign.
- Match `design/DESKTOP_THEMES.md` and its 18 referenced images. Open the exact target before editing a page. Do not redesign or ask the user to select a new style.
- Use `ai-studio-frontend/src/index.css` tokens and its existing components. The user-approved AI Studio frontend supersedes the previous design-system package; preserve its appearance.
- Raster screenshots are design references, never application backgrounds. Obtain isolated artwork faithfully and preserve its text where it belongs to artwork.
- Honor explicit correction notes in `design/INTERACTIONS.md`; normalize conflicting generated metadata through canonical fixtures.
- Do not claim pixel-perfect parity from compile success. Visual QA requires same viewport, theme, content and state screenshots plus independent review.

## Team boundaries

- Coordinator leases disjoint paths, controls contracts/IPC registry/app composition/package manifest/lockfile and integrates changes. One writer per path.
- Each worker owns its implementation tests and reports evidence; independent verifier owns integration/visual acceptance. See docs/TASKS.md dependencies.
- Do not silently alter contract types, change dependencies or introduce another UI library. Request coordinator integration.
- Real and fixture services are explicit modes. No silent fallback that makes unavailable production features appear functional.

## Safety and implementation

- `files.txt` contains credentials: do not copy, commit, serve, log or package it. Use `docs/API_EVIDENCE.md` instead. Keep the original file untouched.
- Renderer cannot import Electron/Node/main services or call Castbox directly. Only named typed preload operations with main-side validation.
- Preserve contextIsolation, sandbox, CSP, sender validation, navigation and permission restrictions.
- Use OS path APIs and native dialogs; never hardcode a user's folder. Validate directory grants, filenames, redirects and external content.
- No cloud sync, social actions, account-history writes, media conversion or invented OAuth.
- Tests must exercise behavior and failure modes; never suppress a failing check, fake output or count skipped tests as passing.
- Package/test on each target OS before claiming support. Public publishing/signing requires actual release configuration.

## Fresh-start layout

Previous implementation is archived outside this workspace; do not restore it implicitly. New backend lives in desktop/, contracts in shared/, and the supplied UI stays in ai-studio-frontend/. Read docs/RESET.md. The initial native integration only implements settings; catalog, downloads and playback are still simulations.
