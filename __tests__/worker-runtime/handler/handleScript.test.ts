import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEnv, mockUrl } from '../../utils/mockEnv'
import { Script } from '../../../src/shared/scripts'
import { CloudflareRequest } from '../request'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import handler from '../../../src/worker'

function getScriptUrl(script: Script) {
  return mockUrl(`${mockEnv.WORKER_ROUTE_PREFIX}/${script}`)
}

function assertRemovedCookieInFetchCall(nthCall = 0) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const fetchRequest = vi.mocked(fetch).mock.calls[nthCall][0] as Request
  expect(fetchRequest).toBeInstanceOf(Request)
  expect(fetchRequest.headers.get('Cookie')).toBeNull()
}

describe('Handle script', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(globalThis, 'fetch')
  })

  describe('Agent loader', () => {
    it('should fetch loader code and return response with correct headers', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('agent-script', {
          headers: {
            'Content-Type': 'text/javascript; charset=utf-8',
            Via: '1.1 a1b9623058220e111430672a0ebed6ea.cloudfront.net (CloudFront)',
            'x-cache': 'Hit from cloudfront',
          },
        })
      )

      const url = getScriptUrl('loader.js')
      const request = new CloudflareRequest(url)
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(fetch).toHaveBeenCalledTimes(1)

      assertRemovedCookieInFetchCall()

      expect(Array.from(response.headers.entries())).toMatchInlineSnapshot(`
        [
          [
            "content-type",
            "text/javascript; charset=utf-8",
          ],
          [
            "via",
            "1.1 a1b9623058220e111430672a0ebed6ea.cloudfront.net (CloudFront)",
          ],
          [
            "x-cache",
            "Hit from cloudfront",
          ],
        ]
      `)
      expect(await response.text()).toEqual('agent-script')
    })

    describe('Cache', () => {
      it('should not apply cache-control headers if origin response has none', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response('agent-script'))

        const url = getScriptUrl('loader.js')
        const request = new CloudflareRequest(url, {
          headers: {
            cookie: '_iidt=12345',
          },
        })
        const ctx = createExecutionContext()
        const response = await handler.fetch(request, mockEnv, ctx)
        await waitOnExecutionContext(ctx)

        expect(response.headers.get('cache-control')).toBeNull()
      })

      it('should not modify cache-control headers if they do not exceed max value', async () => {
        vi.mocked(fetch).mockResolvedValue(
          new Response('agent-script', {
            headers: {
              'cache-control': 'public, max-age=10, s-maxage=10',
            },
          })
        )

        const url = getScriptUrl('loader.js')
        const request = new CloudflareRequest(url)
        const ctx = createExecutionContext()
        const response = await handler.fetch(request, mockEnv, ctx)
        await waitOnExecutionContext(ctx)

        expect(response.headers.get('cache-control')).equals('public, max-age=10, s-maxage=10')
      })

      it('should modify cache-control headers if they exceed max value', async () => {
        vi.mocked(fetch).mockResolvedValue(
          new Response('agent-script', {
            headers: {
              'cache-control': 'public, max-age=10000, s-maxage=10000',
            },
          })
        )

        const url = getScriptUrl('loader.js')
        const request = new CloudflareRequest(url)
        const ctx = createExecutionContext()
        const response = await handler.fetch(request, mockEnv, ctx)
        await waitOnExecutionContext(ctx)

        expect(response.headers.get('cache-control')).equals('public, max-age=3600, s-maxage=60')
      })
    })
  })

  describe('Instrumentor script', () => {
    it('should fetch instrumentor code', async () => {
      const url = getScriptUrl('instrumentor.iife.js')
      const request = new CloudflareRequest(url)
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(fetch).toHaveBeenCalledTimes(0)

      expect(Array.from(response.headers.entries())).toMatchInlineSnapshot(`
        [
          [
            "cache-control",
            "max-age=60, s-maxage=60",
          ],
          [
            "content-type",
            "application/javascript",
          ],
        ]
      `)

      const code = await response.text()

      // Check injected variables
      expect(code).toContain(`=${JSON.stringify(mockEnv.PROTECTED_APIS)}`)
      expect(code).toContain(`="${mockEnv.WORKER_ROUTE_PREFIX}"`)
    })
  })

  describe('Agent processor script', () => {
    it('should fetch agent processor code', async () => {
      const url = getScriptUrl('agent-processor.iife.js')
      const request = new CloudflareRequest(url)
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(fetch).toHaveBeenCalledTimes(0)

      expect(Array.from(response.headers.entries())).toMatchInlineSnapshot(`
        [
          [
            "cache-control",
            "max-age=60, s-maxage=60",
          ],
          [
            "content-type",
            "application/javascript",
          ],
        ]
      `)

      const code = await response.text()

      // Check injected variables
      expect(code).toContain(`="${mockEnv.WORKER_ROUTE_PREFIX}"`)
    })
  })
})
