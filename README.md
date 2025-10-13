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

## Local Development

To get started, run:
```bash
pnpm install
```

It will install the dependencies and prepare the project for local development.

To run the project locally, you need to run these processes in parallel.

1.  **Start the example React SPA:**
    This command starts a preview of the `react-spa` test application.

    ```bash
    pnpm preview:react-spa
    ```
    
2. **Build the instrumentor:**
    This command watches changes in the instrumentor code and rebuilds it.
    ```bash
    pnpm watch:instrumentor
    ```
   > Note: After making changes to the instrumentor code, you need to **reload** the browser page to see the changes.
   

3. **Start the worker:**
    This command starts the Cloudflare Worker in development mode. The worker will proxy requests to the React SPA and inject the necessary scripts.

    ```bash
    pnpm dev
    ```

After starting these processes, you can access the application at the address provided by the `pnpm dev` command output.

## Configuration

The worker is configured using a `wrangler.jsonc` file. An example file `wrangler.example.jsonc` is provided in the repository.

### Variables

-   `FP_REGION`: The Fingerprint region to use. Can be `us`, `eu`, or `ap`.
-   `FP_CDN_URL`: The URL of the FingerprintJS CDN.
-   `FP_INGRESS_BASE_HOST`: The base host for the FingerprintJS ingress API.
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
- When a request to `PROTECTED_APIS` are made, the worker reads signals injected by the instrumentor and sends a request to the Fingerprint server-side intelligence API. The API returns a specific action (e.g., allow/block) for the worker to take to protect the proxied API.

The entry point for the worker is `src/worker/index.ts`.

### Instrumentor

The Instrumentor is a script that is injected into the page by the worker. It patches the `fetch` function to automatically add Fingerprint headers to protected API requests. The entry point for the instrumentor is `src/instrumentor/index.ts`.

The Instrumentor code is bundled and included in the Worker binary during the build process.

## Deployment

To deploy the worker to your Cloudflare account, first prepare `routes` property in `wrangler.jsonc` for your domain:
```json
{
  "routes": [
    {
      "pattern": "DOMAIN/*",
      "zone_id": "ZONE_ID"
    }
  ]
}
```

Keep in mind that `PROTECTED_APIS` and `IDENTIFICATION_PAGE_URLS` should be absolute URLs:
```json
{
  "vars": {
    "PROTECTED_APIS": [
      {
        "method": "POST",
        "url": "https://DOMAIN/api/*"
      }
    ],
    "IDENTIFICATION_PAGE_URLS": [
      "https://DOMAIN/*"
    ]
  }
}
```

Then, run:

```bash
pnpm wrangler:deploy
```

This command will build the worker and deploy it to the environment specified in your `wrangler.jsonc` file.


## Tests

The project uses [Vitest](https://vitest.dev/) for testing. The tests are split into three projects, configured in `vitest.config.ts`:

### Instrumentor

-   **Environment:** `happy-dom`
-   **Path:** `__tests__/instrumentor/**/*.test.ts`
-   **Description:** These tests cover the instrumentor logic, which runs in a browser-like environment.

### Worker runtime

-   **Environment:** `@cloudflare/vitest-pool-workers`
-   **Path:** `__tests__/worker-runtime/**/*.test.ts`
-   **Description:** These tests run in a more accurate Cloudflare Worker runtime environment.

### Worker

-   **Environment:** `node`
-   **Path:** `__tests__/worker/**/*.test.ts`
-   **Description:** These are unit tests for the worker that can run in a Node.js environment for easier debugging.

To run all tests, use the following command:

```bash
pnpm test
```