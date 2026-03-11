# Phase 1 — Castbox catalog access verified

Verified 2026-10-08. All six metadata operations now work anonymously using fresh parameters derived from Castbox's public web client. No cookies, captured credentials, fixed date/nonce or files.txt were used. This is web-client compatibility, not an officially supported API guarantee; future changes may require adapter updates.

## Resolution

The public site's request helper adds `web=1` and daily query parameters. The request parameter map includes `r=1`, is sorted by key and serialized without encoding for its digest, and uses the current UTC calendar date. Wire values are URL encoded afterward. `desktop/catalog/web-query.ts` generates these parameters for every request. No downloaded script is executed at runtime. The only extra web header is `X-Web: true`; no account headers are sent.

Source inspected: public [Castbox web bundle](https://s3.castbox.fm/webstatic/js/page.categories~channellist~claim~claim.failed~claim.link_claimed~claim.link_lost~claim.ok~global~login~m~45963ad9.c425d550.js), modules 295 and 337. Endpoint shapes came from the [public catalog bundle](https://s3.castbox.fm/webstatic/js/page.m.app.index.e4aa0426.js), module 302. These are implementation references, not API documentation.

| Operation | Verified result |
| --- | --- |
| Search channels | HTTP 200; native first/second pages return different IDs |
| Suggestions | HTTP 200; 3 normalized suggestions |
| Channel detail | HTTP 200; requested channel identity verified |
| Channel episode index | HTTP 200; 280 IDs for sample channel |
| Batch episode details | HTTP 200; 50 requested episodes returned in live smoke |
| Single episode | HTTP 200; requested identity verified |

## Reproduce

- `rtk proxy npm run check`: build/typechecks and 20 deterministic tests.
- `rtk proxy npm run test:catalog:live`: six live operations, including 50-item batch. Summaries only.
- `rtk proxy npm run test:catalog:native`: real sandboxed Electron renderer → production preload → production catalog IPC → live Castbox service. Test profile is temporary and removed afterward.

Native results on macOS: search/pagination, suggestions, channel, index, batch, episode, invalid-input rejection, absence of renderer Node globals, and untrusted-window denial all passed. The tests do not depend on fixture responses or alter the production interface. Windows/Linux remain untested.

## Data and boundaries

Contracts in shared/catalog.ts expose string IDs, nullable counts/dates, duration in milliseconds and size in bytes. Channel data is explicitly normalized; account fields such as user_info are dropped. Raw media URLs are not sent to the renderer; metadata only reports source availability. Descriptions remain text and must not be inserted as unsanitized HTML. Artwork URLs are data only; downstream asset loading still needs origin/network policy.

Search uses offset/limit (maximum 50); nextOffset indicates that another page may exist, not a total count. End-of-results may require an empty page. Episode batches are limited to 50, deduplicated and returned in requested order; missing IDs are explicit. Wrong-channel/unrequested records are rejected. Requests have a 10-second timeout, 4 MiB response cap, three-active-request limit, fixed service origin, omitted credentials and rejected redirects. Failures are typed and never converted into mock data. Automatic retry/cache/cancellation are not implemented yet.

Phase 1 exit checks are complete. Phase 2 connects this service to the existing screens with explicit real/prototype modes and stale-response handling. Audio transport/resume, persistence and packaging belong to later phases.
