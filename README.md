<div align="center">
  <img src="docs/assets/readme-banner.png" alt="CastBox Downloader & Player Banner" width="100%" />

  <h1>CastBox Downloader &amp; Player</h1>
  <p><strong>A world-class, privacy-first desktop application for exploring, downloading, and enjoying podcasts offline.</strong></p>

  <p>
    <a href="https://github.com/EhsanShahbazii/CastBox-Downloder-APP/releases"><img alt="Latest Release" src="https://img.shields.io/badge/release-v1.0.0-f97316?style=for-the-badge&logo=github" /></a>
    <img alt="Tests passing" src="https://img.shields.io/badge/tests-74%2F74%20passing-22c55e?style=for-the-badge&logo=checkmarx" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
    <img alt="Electron" src="https://img.shields.io/badge/Electron-44-47848F?style=for-the-badge&logo=electron&logoColor=white" />
    <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-4B5563?style=for-the-badge" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" />
  </p>
</div>

---

## 🌟 Overview

**CastBox Downloader & Player** is a desktop application crafted for audiophiles, researchers, and podcast enthusiasts who want complete ownership over their media library. Built on Electron, React, and TypeScript, it pairs a warm editorial design system with a high-performance, fault-tolerant download manager and SQLite-backed local library.

Whether you are archiving educational series, traveling off-grid, or managing large audio collections, CastBox Downloader provides full multi-threaded downloads, chunked resume, customizable filename templates, and seamless personal token authentication.

---

## ✨ Key Features

### 🔍 Discovery & Live Catalog
- **Instant Search & Autocomplete:** Real-time channel and episode lookups using Castbox's global catalog API.
- **Deep Link Resolution:** Paste any `castbox.fm` show or episode URL for instant navigation.
- **Rich Show Metadata:** High-resolution cover artwork, full descriptions, release dates, episode durations, and file sizes.

### ⚡ Resilient Download Engine
- **Multi-Stream Concurrency:** Download up to 5 episodes simultaneously with configurable bandwidth limits.
- **Interruption Recovery & ETag Validation:** Resume broken downloads without redownloading transferred bytes, backed by strong HTTP ETag verification.
- **Atomic File Publishing:** In-flight downloads are written to private temporary buffers (`.part`) and atomically published to prevent partial or corrupted audio files.
- **Resilient Audio Format Detection:** Handles mislabeled server file extensions (e.g. M4A served with `.mp3` filenames) while preventing corrupt or non-audio downloads.
- **Customizable File Naming:** Format filenames with smart tokens (`{channel}`, `{title}`, `{date}`, `{eid}`) and group downloads by channel directory.
- **Safe Duplicate Handling:** Explicit options to skip, rename, or overwrite existing media with zero risk of file aliasing.

### 🎧 Built-in Hi-Fi Audio Player & Queue
- **Persistent Bottom Player:** Seamless mini-player available on every screen with playback controls, progress scrubbing, and volume management.
- **Expanded Player View:** Dedicated distraction-free listening mode with big album art and fine-grained controls.
- **Variable Playback Speed:** 0.5×, 0.75×, 1.0×, 1.25×, 1.5×, 1.75×, and 2.0× pitch-corrected speed presets.
- **Sleep Timer:** Automatic stop timers (15m, 30m, 60m, or end-of-episode).
- **Listening Queue:** Reorderable, persistent offline queue that remembers where you left off.

### 📚 Local Library & Storage Management
- **Local SQLite Database:** Fast search, filtering, and sorting by publication date, download completion time, duration, or size.
- **Health Check & Relocation:** Automatic detection of missing or moved files with one-click path relocation.
- **Storage Diagnostics:** Real-time visual disk usage indicators and cache clearing.

### 🔐 User Authentication & Privacy
- **1-Click Web Login:** Log in through a secure Castbox browser popup. Session tokens are automatically detected upon login—no manual DevTools or header extraction needed.
- **Personal Token Dispatch:** Enter or edit your personal `x-access-token` and optional secret manually if desired.
- **Zero-Cloud Privacy:** All credentials stay strictly on your device (`settings.json` with strict `0600` permissions). They are never polled, never logged, never synced to any server, and only dispatched directly to Castbox's official API.

---

## 🖼️ User Interface Showcase

CastBox Downloader features an editorial aesthetic with warm paper backgrounds, espresso typography, burnt-orange actions, and dark mode.

<table>
  <tr>
    <th width="50%">Channel View · Light Theme</th>
    <th width="50%">Channel View · Dark Theme</th>
  </tr>
  <tr>
    <td><img src="design/screens/01-channel-light.png" alt="Channel page in light theme" /></td>
    <td><img src="design/screens/10-channel-dark.png" alt="Channel page in dark theme" /></td>
  </tr>
  <tr>
    <th>Local Library · Light Theme</th>
    <th>Local Library · Dark Theme</th>
  </tr>
  <tr>
    <td><img src="design/screens/04-library-light.png" alt="Library page in light theme" /></td>
    <td><img src="design/screens/13-library-dark.png" alt="Library page in dark theme" /></td>
  </tr>
  <tr>
    <th>Expanded Player · Light Theme</th>
    <th>Expanded Player · Dark Theme</th>
  </tr>
  <tr>
    <td><img src="design/screens/18-player-desktop-light.png" alt="Player in light theme" /></td>
    <td><img src="design/screens/19-player-desktop-dark.png" alt="Player in dark theme" /></td>
  </tr>
  <tr>
    <th>Batch Download Review</th>
    <th>Application Settings &amp; Auth</th>
  </tr>
  <tr>
    <td><img src="design/screens/06-bulk-review-light.png" alt="Bulk download review dialog" /></td>
    <td><img src="design/screens/05-settings-light.png" alt="Settings dialog" /></td>
  </tr>
</table>

---

## 🏗️ Architecture & Security Model

```
┌────────────────────────────────────────────────────────┐
│               React Renderer (UI Shell)                │
│   • Tailwind CSS Design Tokens   • Lucide Icons        │
│   • Virtualized Episode Lists    • Web Audio / Player  │
└──────────────────────────┬─────────────────────────────┘
                           │ contextBridge (Preload)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Electron Main Process (Trusted)            │
│  ┌─────────────────────────┐ ┌──────────────────────┐  │
│  │   Catalog HTTP Client   │ │   Download Planner   │  │
│  │  (Permuted Web Digest & │ │  (Path Sanitization  │  │
│  │   Auth Token Injection) │ │  & Directory Grants) │  │
│  └───────────┬─────────────┘ └──────────┬───────────┘  │
│              ▼                          ▼              │
│  ┌─────────────────────────┐ ┌──────────────────────┐  │
│  │     SQLite Database     │ │   Transfer Engine    │  │
│  │ (Saved Shows, Queue,    │ │  (Range Chunks, ETag │  │
│  │  Progress & Downloads)  │ │   Atomic Publishing) │  │
│  └─────────────────────────┘ └──────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Context Isolation & Sandboxing:** The renderer operates strictly within Electron's sandboxed environment without Node.js primitives or arbitrary filesystem access.
- **Explicit Directory Grants:** The app accesses only the user-designated download directory selected via OS native dialogs.
- **Path Sanitization:** Filename tokens are stripped of directory traversal vectors (`../`), Windows reserved device names (`CON`, `PRN`), and unsupported characters.
- **IPC Origin Validation:** All IPC invocations verify the sender webFrame against registered internal application origins.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) LTS (v20+ recommended)
- `npm` (v10+)
- `git`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/EhsanShahbazii/CastBox-Downloder-APP.git
cd CastBox-Downloder-APP

# 2. Install dependencies
npm ci

# 3. Build & launch the desktop application
npm start
```

### Development Scripts

| Command | Action |
| --- | --- |
| `npm start` | Builds frontend & desktop bundle, launches Electron |
| `npm run build` | Full production build with TypeScript check |
| `npm test` | Runs the comprehensive 74-test unit and regression suite |
| `npm run check` | Combined build verification and test runner |
| `npm run dev:ui` | Starts Vite hot-reload server for frontend development |

---

## 🔐 Account Login & Authentication

By default, CastBox Downloader functions in anonymous mode. Logging into your Castbox account unlocks private episodes, subscriber feeds, and bypasses anonymous rate limits.

### Option 1: 1-Click Web Login (Recommended for All Users)

1. Open **Settings** (⚙️ gear icon) in the app sidebar.
2. Scroll to **Castbox Account & Authentication**.
3. Click the orange button: **Log in via Castbox Web**.
4. In the secure popup window, log in with **Google**, **Apple**, **Facebook**, or your **Email**.
5. Once signed in, the window closes automatically and your account is linked.

### Option 2: Manual Token Entry (Power Users)

If you already have your Castbox session credentials:
1. Log in to [castbox.fm](https://castbox.fm) in your browser.
2. Open **Developer Tools** (`Cmd + Option + I` or `F12`) → **Network** tab.
3. Click any request to `everest.castbox.fm` and find `x-access-token` under **Request Headers**.
4. In the app, go to **Settings → Castbox Account & Authentication**, paste the token, and click **Save changes**.

> [!NOTE]
> **Privacy & Security Guarantee:**
> - Credentials are saved strictly to your local device (`settings.json` with secure `0600` file permissions).
> - Tokens and secrets are **never polled** in background loops, **never logged** to disk or console, and **never uploaded** to any third-party cloud service.
> - They are only dispatched directly in HTTP headers to Castbox's official API (`everest.castbox.fm`).

---

## 🧪 Testing & Verification

The test suite covers:
- **Web Query Permutation:** Algorithmic verification of Castbox daily query digest signatures.
- **Download Planner Security:** Traversal attacks, reserved Windows device tokens, case collision renames, and atomic directory reservations.
- **Stream Resumption:** Verified byte append, strong ETag mismatches, truncated payload recovery, and cancel rollbacks.
- **SQLite Storage Migrations:** Database version upgrades, index integrity, and corrupt database preservation.
- **User Token Injection:** Validation that user authentication headers are properly mounted and isolated.

Run tests at any time with:
```bash
npm test
```

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<div align="center">
  <sub>Developed with ❤️ by <a href="https://github.com/EhsanShahbazii">Ehsan Shahbazi</a></sub>
</div>
