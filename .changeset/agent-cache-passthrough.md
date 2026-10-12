---
'flow-cloudflare-worker': patch
---

Return the agent loader response unchanged. The worker no longer stores it in the Cloudflare cache, adds `s-maxage`, or caps `max-age`. `Cache-Control`, `Age` and `ETag` now match what Fingerprint's CDN sends.
