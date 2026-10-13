---
'flow-cloudflare-worker': patch
---

Return 404 for `loader.js` requested with a query string, instead of forwarding it to the Fingerprint API. Query parameters are no longer forwarded to the CDN when fetching the agent loader.
