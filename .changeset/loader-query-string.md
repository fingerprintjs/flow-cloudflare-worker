---
'flow-cloudflare-worker': patch
---

Serve the agent loader when `loader.js` is requested with a query string. Previously, `loader.js?q=1` was forwarded to the wrong upstream and failed with 403 or 404.
