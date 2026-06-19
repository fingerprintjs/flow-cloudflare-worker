---
'flow-cloudflare-worker': minor
---

Encode the existing edge headers (`fp-ip-info-v{4,6}-address` and `fp-bot-info-*`) using [RFC 9651](https://www.rfc-editor.org/info/rfc9651/) structured fields so they match the format of the IP-intelligence headers. 

IPs and enum-like values (`fp-bot-info-category`, `fp-bot-info-identity`) use sf-strings (e.g. `"94.142.239.124"`, `"verified"`); free-form values (`fp-bot-info-provider`, `fp-bot-info-name`) use sf-display-strings (e.g. `%"Fingerprint"`). 

Consumers will need to unquote / percent-decode these header values.
