<p align="center">
  <a href="https://fingerprint.com">
    <picture>
     <source media="(prefers-color-scheme: dark)" srcset="https://fingerprintjs.github.io/home/resources/logo_light.svg" />
     <source media="(prefers-color-scheme: light)" srcset="https://fingerprintjs.github.io/home/resources/logo_dark.svg" />
     <img src="https://fingerprintjs.github.io/home/resources/logo_dark.svg" alt="Fingerprint logo" width="312px" />
   </picture>
  </a>
</p>
<p align="center">
  <a href="https://github.com/fingerprintjs/flow-cloudflare-worker/actions/workflows/build.yml"><img src="https://github.com/fingerprintjs/flow-cloudflare-worker/actions/workflows/build.yml/badge.svg" alt="Build status"></a>
  <a href="https://fingerprintjs.github.io/flow-cloudflare-worker/coverage/"><img src="https://fingerprintjs.github.io/flow-cloudflare-worker/coverage/badges.svg" alt="coverage"></a>
  <a href="https://github.com/fingerprintjs/flow-cloudflare-worker/actions/workflows/release.yml"><img src="https://github.com/fingerprintjs/flow-cloudflare-worker/actions/workflows/release.yml/badge.svg" alt="Release status"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/:license-mit-blue.svg" alt="MIT license"></a>
  <a href="https://fingerprintjs.github.io/flow-cloudflare-worker/docs/"><img src="https://img.shields.io/badge/-Documentation-green" alt="Documentation"></a>
</p>

# Flow Cloudflare Worker

Cloudflare Worker for Fingerprint Flow.

> ⚠️ **Work in progress**: This is a beta version of the Flow Cloudflare Worker.

## Requirements

* [Fingerprint Pro account](https://dashboard.fingerprint.com/signup) with the _Editor_ role assigned (or any role with _Edit configuration_ permission).
* A website served by Cloudflare. For maximum accuracy benefits, your website should be [proxied by Cloudflare](https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/) (not DNS-only).

## Configuration

The worker is configured using a `wrangler.jsonc` file. An example file `wrangler.example.jsonc` is provided in the repository.

### Variables

-   `FP_REGION`: The Fingerprint region to use. Can be `us`, `eu`, or `ap`.
-   `WORKER_ROUTE_PREFIX`: A prefix for specific routes handled by the worker. This is used to avoid conflicts with other routes on the same domain.
-   `FP_PUBLIC_KEY`: Your Fingerprint public key.
-   `FP_SECRET_KEY`: Your Fingerprint secret key.
-   `FP_RULESET_ID`: Your Fingerprint ruleset ID.
    -   If not provided, the worker will default to a "monitor mode" where it still identifies the visitor for any request to `PROTECTED_APIS` but does not evaluate a ruleset for those requests.
-   `PROTECTED_APIS`: An array of APIs to protect with Fingerprint. Each object in the array should have a `method` and `url` property. The `url` pattern cannot be relative but it can contain wildcards.
    - Example: `[ { method: 'POST', url: 'https://example.com/sign-up/*' }]`
-   `IDENTIFICATION_PAGE_URLS`: An array of url patterns that cannot be relative but can contain wildcards where the Fingerprint identification script should be injected. 
    - Example: `[ 'https://example.com/login', 'https://example.com/signup/*' ]` 

## Architecture

### Worker

The Worker is a Cloudflare Worker that acts as a reverse proxy. Its main responsibilities are:
- Injecting the instrumentor and agent loader scripts on pages matching `IDENTIFICATION_PAGE_URLS`.
- Proxying Fingerprint API requests made by the JavaScript agent.
- When a request to `PROTECTED_APIS` are made, the worker reads signals injected by the instrumentor and sends a request to the Fingerprint Identification API. The API returns a specific action (e.g., allow/block) for the worker to take to with the protected API request.

The entry point for the worker is `src/worker/index.ts`.

### Instrumentor

The Instrumentor is a script that is injected into the page by the worker. It patches the `fetch` function to automatically add Fingerprint headers to protected API requests. The entry point for the instrumentor is `src/scripts/instrumentor/index.ts`.

The Instrumentor code is bundled and included in the Worker binary during the build process.

### Agent data processor

Located in `src/scripts/agent-data-processor/index.ts`, the Agent data processor is responsible for processing the data returned by the Fingerprint Identification API.
It is used for the HTML forms that are not sent via `fetch` or `XMLHttpRequest`. After the form is submitted, if it's `action` is listed in protected APIs, the agent processor script will be injected into the response to process agent data received from the initial identification request.