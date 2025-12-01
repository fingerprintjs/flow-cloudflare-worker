# Contributing to Flow Cloudflare Worker

## Working with code

We prefer using [pnpm](https://pnpm.io/) for installing dependencies and running scripts.

The `main` branch is locked for the push action.

`main` branch is always where we create releases.

For proposing changes, use the standard [pull request approach](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request). It's recommended to discuss fixes or new functionality in the Issues, first.

Create pull requests for the `main` branch.

> Note about third-party dependencies:
> 
> Our goal is to keep the number of dependencies as low as possible. For now we rely only on `zod` for type validation.
> 
> One thing to keep in mind is that it should be **avoided** to use any dependencies in **scripts** that are injected by the worker ([instrumentor](src/scripts/instrumentor) and [agent-processor](src/scripts/agent-processor)), in order to keep their size as small as possible.

### How to build
After cloning the repo, run `pnpm install` to install packages and prepare the project for local development.

Run `pnpm build` for creating a build in `dist` folder. After building, `dist/flow_cloudflare_worker/index.js` file is created, and it is used to deploy to Cloudflare.

> 💡 Don't forget to update the `wrangler.jsonc` with your `FP_SECRET_KEY`, `FP_PUBLIC_KEY`, `FP_REGION`, and `FP_RULESET_ID`.

## Local Development

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

   > Note: In your terminal you might see the following warning:  `The public directory feature may not work correctly`.  This is expected behavior, as the instrumentor artifact is output to the public directory, from which the worker imports it. 


3. **Start the worker:**
   This command starts the Cloudflare Worker in development mode. The worker will proxy requests to the React SPA and inject the necessary scripts.

    ```bash
    pnpm dev
    ```

After starting these processes, you can access the application at the address provided by the `pnpm dev` command output.

> Note: You can use the following variables to modify the targets for Fingerprint-related requests:
> -   `FP_CDN_HOST`: The URL of the Fingerprint CDN.
> -   `FP_INGRESS_BASE_HOST`: The base host for the Fingerprint ingress API.

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

## Code style

The code style is controlled by [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/). Run to check that the code style is ok:
```shell
pnpm lint
```

You aren't required to run the check manually, the CI will do it. Run the following command to fix style issues (not all issues can be fixed automatically):
```shell
pnpm lint:fix
```

## Commit style

You are required to follow [conventional commits](https://www.conventionalcommits.org) rules.

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