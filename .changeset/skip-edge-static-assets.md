---
'flow-cloudflare-worker': minor
---

Skip the Automation Intelligence API call for static asset requests.

* On identification pages matched by a pattern ending with `*` (for example `https://example.com/assets/header.png` matching `https://example.com/*`), `GET` and `HEAD` requests with a static asset `Sec-Fetch-Dest` (`script`, `style`, `image`, `font`, and similar) go straight to the origin.
* Client-supplied `fp-*` headers are still removed.
* Page loads, fetch/XHR calls, requests without `Sec-Fetch-Dest`, and requests whose path is the matched pattern's path (like the root page for `https://example.com/*`) call the API as before.
* To always call the API for another page, including with a query string, add a trailing-wildcard pattern that wins matching, like `https://example.com/checkout*`.

Set `FP_EDGE_INCLUDE_STATIC_ASSETS` to `true` to restore the previous behavior.
