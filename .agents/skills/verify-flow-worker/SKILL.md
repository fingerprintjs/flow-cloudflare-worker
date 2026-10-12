---
name: verify-flow-worker
description: Investigate a Flow worker change live by deploying a throwaway worker to real Cloudflare and probing it over HTTP against the real Fingerprint backend. Use for exploratory checks, main-vs-branch comparisons, or a specific Fingerprint environment. For final checks that can be stable assertions, add a normal e2e test instead.
---

# Verify the Flow worker

The e2e suite (`e2e/`) already deploys workers to real Cloudflare and runs Playwright against them, on every PR and nightly. **If what you want to check can be a stable assertion, write it as an e2e test and run the suite** (see `e2e/README.md`).

Use this skill when the suite doesn't fit:
- You're investigating and don't yet know what to assert.
- You want `main` and a branch side by side.
- You need a specific Fingerprint environment, such as staging.

## Rules

- Deploy only under a new worker name starting with `verify-` (e.g. `verify-flow-<label>`). Never overwrite an existing worker or route.
- Credentials stay in the env files. Pass the files by path and never read, print or copy their values. Reading `TEST_DOMAIN` is fine.

## Inputs

The skill uses the e2e suite's settings file, `e2e/.env.local`. It needs `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TEST_DOMAIN` and the `FP_*` keys. If the file is missing, copy `e2e/.env.dist` there and ask the user to fill it in. Don't ask for the values in chat.

For another Fingerprint environment, put only the values that differ (keys, `FP_REGION`, `FP_CDN_HOST`, `FP_INGRESS_BASE_HOST`) in e.g. `e2e/.env.staging.local`, and pass it with `--env-file`. Both files are gitignored.

## Deploy

1. `pnpm build`. It writes the bundle to `dist/flow_cloudflare_worker/index.js` and wipes the previous contents of that folder. In a fresh checkout or worktree, first run `pnpm install --frozen-lockfile --offline` and copy `wrangler.example.jsonc` to `wrangler.jsonc`. The build needs that file but doesn't use its values.
2. Deploy:
   ```sh
   node .agents/skills/verify-flow-worker/scripts/wrangler.mjs [--env-file e2e/.env.staging.local] <name> deploy
   ```
   [scripts/wrangler.mjs](scripts/wrangler.mjs) loads the env files, deploys, then uploads the `FP_*` keys and hosts as worker secrets. On first use it writes `.wrangler/verify/<name>.jsonc` from `wrangler.example.jsonc`. Edit that file for test-specific vars, e.g. `IDENTIFICATION_PAGE_URLS` pointing at a real page, and delete it to regenerate. Test URLs are `https://<name>.<TEST_DOMAIN>/<WORKER_ROUTE_PREFIX>/...`. A 504 from the API is transient, so retry.
3. Wait until `/<prefix>/loader.js` returns 200 before testing. A fresh worker first returns 530 while DNS propagates, then 500 `FP_PUBLIC_KEY is not set` until the secrets land, about 10 to 20 seconds in all. Don't count those responses. If curl can't resolve the new host, it may have cached the lookup from before the DNS record existed: use `curl --resolve <host>:443:$(dig +short <host> @1.1.1.1 | head -1)`.

To compare branches, deploy `main` and the branch as two workers and run the same requests against both. Build the second one in a git worktree:
- Copy in the env files, plus this skill folder if it isn't committed there.
- Run build, deploy and delete for each worker from the checkout it was built in, because the script and `dist/` are relative to the current directory.

## Drive

- Headers: `curl -sD - -o /dev/null <url>`. Body: `curl -s --compressed <url> | head -c 200`, as a separate request.
- Use a real browser (Playwright or Chrome DevTools) for anything that needs a page: script injection, protected APIs, the browser cache.
- To check what the worker changed, request the upstream URL directly and diff the two responses. Use the exact URL the worker fetches, including the `ii` param from `src/shared/integrationInfo.ts`. For the loader that is `https://$FP_CDN_HOST/v4/$FP_PUBLIC_KEY` with `ii=fingerprint-flow-cloudflare/<version>/procdn` appended to the request's query string. Without `ii`, the CDN serves a different cache entry with its own ETag and `max-age`. Load the env file inside the command and mask the key in the output. `max-age` differs between Cloudflare edge locations (see `cf-ray`), so compare it loosely, and everything else exactly. Compare bodies by hash.
- Upstream caches are part of the system. The Fingerprint CDN caches each full URL, so a request you think is fresh may be a cache hit. `Age: 0` doesn't prove a miss. If a step needs a cold miss, deploy with a unique version.
- Zone settings such as Browser Cache TTL and URL normalization only apply on a real zone, not on workers.dev.

## Evidence

- Report each check with the request, the observed value and PASS or FAIL. A FAIL stays a FAIL. On `main`, the failures are the "before" picture.
- Save raw headers outside `dist/flow_cloudflare_worker/`, because the next build wipes it.
- When you're done, consider whether a check should become a regular test in `e2e/` (the real CDN) or `__tests__/` (a mocked upstream). Add stable invariants such as "no `s-maxage`" or "304 on revalidation", not exact values like `max-age` or `Age` that change with the CDN. Suggest them to the user rather than adding them unasked.

## Cleanup

Test workers can stay if the user says so. Otherwise remove only what you deployed: `wrangler.mjs <name> delete --force`. The delete may print a KV namespace authentication error and exit non-zero even when it worked. Ignore both, and check that the worker is gone with `wrangler.mjs <name> deployments list`, which should fail with code 10007.
