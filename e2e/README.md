# Cloudflare Flow Worker E2E tests

## How to run

### Prerequisites:
- You need to build the worker: `pnpm build` in the root directory.

### Steps

1. Prepare environment variables:
```bash
cp .env.dist .env.local
```

> Note: The Cloudflare Token should have sufficient permissions to deploy Workers on your account. 
> You can use the **Edit Cloudflare Workers** template in your [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens).

2. Deploy the infrastructure:
```bash
pnpm run deploy 
```

3. Run tests:
```bash
pnpm test 
```

4. (Optional) Remove the infrastructure after testing:
```bash
pnpm delete-deployments 
```

## How it works
The E2E tests deploy Cloudflare Workers with a Flow configuration and a TestProjects to a Cloudflare account.
Test Projects configuration is described in the `projects/projects.ts`. Each project can have a personal set of environment variables. You just need to add a capitalized underscored prefix of the project name to the variable name. For example, if you have a project named `ruleset-based-block` and you want to set `FP_RULESET_ID`, you add an environment variable named `RULESET_BASED_BLOCK_FP_RULESET_ID`.
