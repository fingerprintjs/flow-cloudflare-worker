// Fix for Cloudflare types: https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/#unit-tests
export const CloudflareRequest = Request<unknown, IncomingRequestCfProperties>
