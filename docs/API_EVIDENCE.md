# Sanitized Castbox evidence and investigation task

Never publish or copy `files.txt`; it contains authentication and identity data. This summary is safe to share with implementation agents. No credentials are necessary for reading it.

| Method / route | Role | Observed shape |
| --- | --- | --- |
| GET everest.castbox.fm/data/keywords/suggestion | Autocomplete | query keyword/limit; response keyword/cid pairs |
| GET /data/search_channel/v2 | Channel search | keyword/country/skip/limit/order; channel_list |
| GET /data/channel/v3 | Channel detail | cid/raw; channel fields |
| GET /data/episodes/overview | Channel index | cids; episode_list containing eid/release_date |
| GET /data/episode_list/v2 | Batch details | cid/eids; episode_list |
| GET /data/episode/v4 | Episode and source | eid/raw; episode and channel, url/urls |

Captured example cid 5439580, eid 813705274. Actual episode title Almost - Beren Olivia; duration 186000 appears to be milliseconds; size 2984915 appears to be bytes. Verify normalization. Source screenshots use fictional/varied metadata; choose deterministic canonical visual fixtures separately. The captured `channel_type: private` is not equivalent to episode `private` or an authorization policy.

2026-10-07 probe evidence: suggestions/index/single episode succeeded without auth under minimal requests. Search/channel/batch initially returned 401; all three succeeded with captured full URL parameters (`m/n/r`) and ordinary web headers, still without tokens/cookies. Parameters and headers changed together, so the required factor remains unknown. This is not proof of durable or officially supported anonymous access.

BE-01 must investigate fresh request generation, access behavior, paging, rate limiting, maximum batch size, normal/error schema and media redirects. Use no captured credentials. Save sanitized fixtures and request metadata only. A fixed captured nonce/date must never be the production implementation. If durable access cannot be established, report the precise capability gap; do not fabricate Google OAuth or share one user's session. Frontend continues against an explicitly selected mock adapter, not a silent fallback on real failures.

History POST to sync.castbox.fm/my/records exists in the raw capture but is excluded from app scope. Playback progress and saved channels are local. Do not call it.

Validation targets: malformed JSON, service error code within HTTP 200, missing fields, unknown duration/size, duplicates, long/persian titles, absent cover, canceled request, stale response, 401/403/404/429/5xx, redirects, changed media URL, non-audio response. Redact URL query secrets in logs. Restrict pasted links to supported Castbox hostnames/forms; treat arbitrary text as search, not an arbitrary network fetch.
