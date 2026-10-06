---
'flow-cloudflare-worker': minor
---

Skip the Automation Intelligence API call for static asset requests.

On identification pages matched by a pattern ending with `*` (for example `https://example.com/*`), `GET` and `HEAD` requests with a static asset `Sec-Fetch-Dest` (`script`, `style`, `image`, `font`, and similar) go straight to the origin. Exact patterns always call the API. Client-supplied `fp-*` headers are still removed. Page loads, fetch/XHR calls, and requests without `Sec-Fetch-Dest` call the API as before.

Set `FP_EDGE_INCLUDE_STATIC_ASSETS` to `true` to restore the previous behavior.
