import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../src/worker'
import { EnvWithAssets, TypedEnv } from '../../src/worker/types'
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test'

const sampleHtml = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Document</title>
</head>
<body>
  <div>Test website</div>
</body>
</html>
`

const mockEnv: TypedEnv = {
  FPJS_CDN_URL: 'fpcdn.io',
  FPJS_INGRESS_BASE_HOST: 'api.fpjs.io',
  PROTECTION_CONFIG: {
    protectedApis: [],
    identificationPageUrls: [],
  },
  PUBLIC_KEY: 'public_key',
  SECRET_KEY: 'secret_key',
  SCRIPTS_BEHAVIOR_PATH: 'scripts',
  FP_RULESET_ID: '',
}

// Fix for Cloudflare types: https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/#unit-tests
const CloudflareRequest = Request<unknown, IncomingRequestCfProperties>

describe('Flow Cloudflare Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.assign(env, mockEnv)
  })

  describe('Scripts injection', () => {
    it('should inject scripts on request to identification page', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(sampleHtml, {
          headers: {
            'Content-Type': 'text/html',
          },
          status: 200,
        })
      )

      const request = new CloudflareRequest('https://example.com/')
      const ctx = createExecutionContext()

      const response = await handler.fetch(request, env as EnvWithAssets)
      await waitOnExecutionContext(ctx)
      const html = await response.text()

      expect(html).toContain('<script src="/scripts/agent.iife.js"></script>')
      expect(html).toContain('<script src="/scripts/instrumentor.iife.js"></script>')
    })
  })
})
