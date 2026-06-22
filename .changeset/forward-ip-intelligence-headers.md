---
'flow-cloudflare-worker': minor
---

Forward the full Automation Intelligence API IP intelligence to the protected origin.

Requests now include `fp-ip-info-v{4,6}-*` headers for geolocation, ASN, and datacenter; `fp-proxy*` headers when a proxy is detected; `fp-vpn*` headers when a VPN is detected; and `fp-ip-blocklist-tor-node` when the IP is a Tor exit.

String, date, and boolean values follow [RFC 9651](https://www.rfc-editor.org/info/rfc9651/) structured fields, and headers for absent, empty, or false values are omitted.
