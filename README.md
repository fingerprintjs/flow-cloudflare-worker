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

> ⚠️ This project is in development.

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
-   `PROTECTED_APIS`: An array of absolute APIs to protect with Fingerprint. Each object in the array should have a `method` and `url` property. The `url` can contain wildcards.
-   `IDENTIFICATION_PAGE_URLS`: An array of absolute URLs where the Fingerprint identification script should be injected. The URLs can contain wildcards.

## Architecture

The project consists of two main parts: the **Worker** and the **Instrumentor**.

### Worker

The Worker is a Cloudflare Worker that acts as a reverse proxy. Its main responsibilities are:
- Injecting the instrumentor and agent loader scripts on pages matching `IDENTIFICATION_PAGE_URLS`.
- Proxying Fingerprint API requests made by the JavaScript agent.
- When a request to `PROTECTED_APIS` are made, the worker reads signals injected by the instrumentor and sends a request to the Fingerprint Identification API. The API returns a specific action (e.g., allow/block) for the worker to take to with the protected API request.

The entry point for the worker is `src/worker/index.ts`.

### Instrumentor

The Instrumentor is a script that is injected into the page by the worker. It patches the `fetch` function to automatically add Fingerprint headers to protected API requests. The entry point for the instrumentor is `src/instrumentor/index.ts`.

The Instrumentor code is bundled and included in the Worker binary during the build process.