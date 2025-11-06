# Cloudflare Flow Worker E2E tests

## How to run

### Prerequisites:
- You need to build the worker: `pnpm build` in the root directory.

### Steps

1. Prepare environment variables:
```bash
cp .env.dist .env
```

2. Deploy the infrastructure:
```bash
pnpm deploy 
```

3. Run tests:
```bash
pnpm test 
```

4. (Optional) Remove the infrastructure after testing:
```bash
pnpm delete-deployments 
```