# Desktop designs — light and dark

Nine primary desktop screens, each in both themes: 18 images total. Twelve new images complete the six existing desktop references. No new mobile designs or implementation code were created.

Selected visual direction: warm editorial cream/espresso/orange. All theme counterparts were generated using their matching light/dark source as an image reference. New desktop detail/player/queue layouts use the existing desktop shell and prior content references.

## Coverage index

| Desktop surface | Light | Dark |
| --- | --- | --- |
| Find / Search results | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/02-find-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/11-find-dark.png) |
| Channel details / Theme menu | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/01-channel-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/10-channel-dark.png) |
| Downloads | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/12-downloads-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/03-downloads-dark.png) |
| Library / File menu | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/04-library-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/13-library-dark.png) |
| Settings / Filename templates | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/05-settings-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/14-settings-dark.png) |
| Bulk download review | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/06-bulk-review-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/15-bulk-review-dark.png) |
| Episode details | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/16-episode-desktop-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/17-episode-desktop-dark.png) |
| Now Playing / Sleep timer | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/18-player-desktop-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/19-player-desktop-dark.png) |
| Listening queue / Reorder menu | [Light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/20-queue-desktop-light.png) | [Dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/21-queue-desktop-dark.png) |

## Coding notes

Use INTERACTIONS.md for behavior. Images are static visual references, not validated CSS layouts. Preserve a shared component structure between themes; apply semantic tokens rather than writing separate screen implementations.

The initial dark Downloads image still has a queued-item checkmark artifact: use the neutral clock shown in the new light version for both themes. Some metadata, dates, artwork and transport icons differ across generated screens; use a canonical fixture set. Full player metadata shows Oct 7 while episode details shows Oct 6; normalize this before coding. Header theme chevrons and sun/moon glyphs also need standardization.

Coverage includes the primary screen states and pictured menus. It does not include a separate image for every empty/loading/error state, each library tab, each settings subsection, or every modal; those remain specified in INTERACTIONS.md. Existing mobile files are retained but are outside this desktop-only delivery.

## Find / Search results

### Light

![Find / Search results — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/02-find-light.png)

### Dark

![Find / Search results — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/11-find-dark.png)

## Channel details / Theme menu

### Light

![Channel details / Theme menu — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/01-channel-light.png)

### Dark

![Channel details / Theme menu — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/10-channel-dark.png)

## Downloads

### Light

![Downloads — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/12-downloads-light.png)

### Dark

![Downloads — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/03-downloads-dark.png)

## Library / File menu

### Light

![Library / File menu — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/04-library-light.png)

### Dark

![Library / File menu — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/13-library-dark.png)

## Settings / Filename templates

### Light

![Settings / Filename templates — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/05-settings-light.png)

### Dark

![Settings / Filename templates — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/14-settings-dark.png)

## Bulk download review

### Light

![Bulk download review — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/06-bulk-review-light.png)

### Dark

![Bulk download review — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/15-bulk-review-dark.png)

## Episode details

### Light

![Episode details — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/16-episode-desktop-light.png)

### Dark

![Episode details — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/17-episode-desktop-dark.png)

## Now Playing / Sleep timer

### Light

![Now Playing / Sleep timer — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/18-player-desktop-light.png)

### Dark

![Now Playing / Sleep timer — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/19-player-desktop-dark.png)

## Listening queue / Reorder menu

### Light

![Listening queue / Reorder menu — light](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/20-queue-desktop-light.png)

### Dark

![Listening queue / Reorder menu — dark](/Users/ehsan/Desktop/Codex/Castbox Downloder/design/screens/21-queue-desktop-dark.png)
