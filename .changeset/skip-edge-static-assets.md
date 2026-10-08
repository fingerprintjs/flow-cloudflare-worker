---
'flow-cloudflare-worker': minor
---

Skip the Automation Intelligence API call for static asset requests.

GET/HEAD identification-page requests whose `Sec-Fetch-Dest` is `script`, `style`, `image`, `font`, and similar go straight to the origin. Client-supplied `fp-*` headers are still removed. Edge always runs when the request path is the matched identification pattern's path (`/` and `/?q=1` for `https://example.com/*`). To guarantee Edge on another page, including with a query string, add `https://example.com/checkout*`.

Set `FP_EDGE_INCLUDE_STATIC_ASSETS` to `true` to restore the previous behavior.
