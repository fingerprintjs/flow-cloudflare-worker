import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../../src/worker'
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test'
import { CloudflareRequest } from '../request'
import { mockEnv, mockWorkerBaseUrl } from '../../utils/mockEnv'
import { mockEdgeResponseIpV4, mockEdgeResponseIpV6 } from '../../utils/mockEdge'
import { EdgeHeaders } from '../../../src/worker/utils/headers'

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

describe('Scripts injection', () => {
  vi.spyOn(globalThis, 'fetch')

  beforeEach(() => {
    vi.clearAllMocks()

    Object.assign(env, mockEnv)
  })

  it('should inject scripts on request to identification page', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(sampleHtml, {
        headers: {
          'Content-Type': 'text/html',
        },
        status: 200,
      })
    )

    const request = new CloudflareRequest(mockWorkerBaseUrl)
    const ctx = createExecutionContext()

    const response = await handler.fetch(request, mockEnv, ctx)
    await waitOnExecutionContext(ctx)
    const html = await response.text()

    expect(html).toContain('<script defer src="/scripts/instrumentor.iife.js"></script>')
  })

  it('should return normal response on page with broken HTML', async () => {
    const brokenHtml = `
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    `
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(brokenHtml, {
        headers: {
          'Content-Type': 'text/html+maybe; charset=utf-16',
        },
        status: 200,
      })
    )

    const request = new CloudflareRequest('https://example.com/')
    const ctx = createExecutionContext()

    const response = await handler.fetch(request, mockEnv, ctx)
    await waitOnExecutionContext(ctx)
    const html = await response.text()

    expect(html).toEqual(brokenHtml)
  })

  describe('Edge API', () => {
    it('sends Edge API headers to origin', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockEdgeResponseIpV4), {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        })
      )

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(sampleHtml, {
          headers: {
            'Content-Type': 'text/html',
          },
          status: 200,
        })
      )

      const request = new CloudflareRequest(mockWorkerBaseUrl)
      request.headers.set('cf-connecting-ip', '94.142.239.124')
      const ctx = createExecutionContext()

      const env = {
        ...mockEnv,
        FP_EDGE_API: 'true',
      }

      const response = await handler.fetch(request, env, ctx)
      await waitOnExecutionContext(ctx)
      const html = await response.text()

      expect(fetch).toHaveBeenCalledTimes(2)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const edgeRequest = vi.mocked(fetch).mock.calls[0][0] as Request
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const originRequest = vi.mocked(fetch).mock.calls[1][0] as Request
      expect(edgeRequest).toBeInstanceOf(Request)
      expect(originRequest).toBeInstanceOf(Request)
      const edgeRequestBody = await edgeRequest.json()
      expect(edgeRequestBody).toEqual({
        headers: [
          {
            name: 'cf-connecting-ip',
            value: '94.142.239.124',
          },
        ],
        url: request.url,
        ipv4_address: '94.142.239.124',
        ipv6_address: undefined,
        method: request.method,
      })

      expect(html).toContain('<script defer src="/scripts/instrumentor.iife.js"></script>')

      expect(originRequest.headers.get(EdgeHeaders.IpV4Address)).toEqual('94.142.239.124')
      expect(originRequest.headers.has(EdgeHeaders.IpV6Address)).toBeFalsy()
      expect(originRequest.headers.get(EdgeHeaders.BotInfoCategory)).toEqual('ai_agent')
      expect(originRequest.headers.get(EdgeHeaders.BotInfoProvider)).toEqual('Fingerprint')
      expect(originRequest.headers.get(EdgeHeaders.BotInfoName)).toEqual('Fingerprint Agent')
      expect(originRequest.headers.get(EdgeHeaders.BotInfoIdentity)).toEqual('signed')

      Object.values(EdgeHeaders).forEach((header) => {
        expect(response.headers.get(header)).toBeNull()
      })
    })

    it('with ipv6', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockEdgeResponseIpV6), {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        })
      )

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(sampleHtml, {
          headers: {
            'Content-Type': 'text/html',
          },
          status: 200,
        })
      )

      const request = new CloudflareRequest(mockWorkerBaseUrl)
      request.headers.set('cf-connecting-ip', '2001:db8:3333:4444:5555:6666:7777:8888')
      const ctx = createExecutionContext()

      const env = {
        ...mockEnv,
        FP_EDGE_API: 'true',
      }

      const response = await handler.fetch(request, env, ctx)
      await waitOnExecutionContext(ctx)
      const html = await response.text()

      expect(fetch).toHaveBeenCalledTimes(2)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const edgeRequest = vi.mocked(fetch).mock.calls[0][0] as Request
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const originRequest = vi.mocked(fetch).mock.calls[1][0] as Request
      expect(edgeRequest).toBeInstanceOf(Request)
      expect(originRequest).toBeInstanceOf(Request)

      const edgeRequestBody = await edgeRequest.json()
      expect(edgeRequestBody).toEqual({
        headers: [
          {
            name: 'cf-connecting-ip',
            value: '2001:db8:3333:4444:5555:6666:7777:8888',
          },
        ],
        url: request.url,
        ipv4_address: undefined,
        ipv6_address: '2001:db8:3333:4444:5555:6666:7777:8888',
        method: request.method,
      })

      expect(html).toContain('<script defer src="/scripts/instrumentor.iife.js"></script>')

      expect(originRequest.headers.has(EdgeHeaders.IpV4Address)).toBeFalsy()
      expect(originRequest.headers.get(EdgeHeaders.IpV6Address)).toEqual('2001:db8:3333:4444:5555:6666:7777:8888')
      expect(originRequest.headers.get(EdgeHeaders.BotInfoCategory)).toEqual('ai_agent')
      expect(originRequest.headers.get(EdgeHeaders.BotInfoProvider)).toEqual('Fingerprint')
      expect(originRequest.headers.get(EdgeHeaders.BotInfoName)).toEqual('Fingerprint Agent')
      expect(originRequest.headers.get(EdgeHeaders.BotInfoIdentity)).toEqual('signed')
    })

    it('with empty Edge response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(undefined, {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        })
      )

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(sampleHtml, {
          headers: {
            'Content-Type': 'text/html',
          },
          status: 200,
        })
      )

      const request = new CloudflareRequest(mockWorkerBaseUrl)
      request.headers.set('cf-connecting-ip', '94.142.239.124')
      const ctx = createExecutionContext()

      const env = {
        ...mockEnv,
        FP_EDGE_API: 'true',
      }

      const response = await handler.fetch(request, env, ctx)
      await waitOnExecutionContext(ctx)
      const html = await response.text()

      expect(fetch).toHaveBeenCalledTimes(2)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const edgeRequest = vi.mocked(fetch).mock.calls[0][0] as Request
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const originRequest = vi.mocked(fetch).mock.calls[1][0] as Request
      expect(edgeRequest).toBeInstanceOf(Request)
      expect(originRequest).toBeInstanceOf(Request)

      const edgeRequestBody = await edgeRequest.json()
      expect(edgeRequestBody).toEqual({
        headers: [
          {
            name: 'cf-connecting-ip',
            value: '94.142.239.124',
          },
        ],
        url: request.url,
        ipv4_address: '94.142.239.124',
        ipv6_address: undefined,
        method: request.method,
      })

      expect(html).toContain('<script defer src="/scripts/instrumentor.iife.js"></script>')

      expect(originRequest.headers.has(EdgeHeaders.IpV4Address)).toBeFalsy()
      expect(originRequest.headers.has(EdgeHeaders.IpV6Address)).toBeFalsy()
      expect(originRequest.headers.has(EdgeHeaders.BotInfoCategory)).toBeFalsy()
      expect(originRequest.headers.has(EdgeHeaders.BotInfoProvider)).toBeFalsy()
      expect(originRequest.headers.has(EdgeHeaders.BotInfoName)).toBeFalsy()
      expect(originRequest.headers.has(EdgeHeaders.BotInfoIdentity)).toBeFalsy()
    })

    it('with error from Edge API', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'error' }), {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 400,
        })
      )

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(sampleHtml, {
          headers: {
            'Content-Type': 'text/html',
          },
          status: 200,
        })
      )

      const request = new CloudflareRequest(mockWorkerBaseUrl)
      request.headers.set('cf-connecting-ip', '94.142.239.124')
      request.headers.set(EdgeHeaders.BotInfoCategory, 'ai_agent')
      request.headers.set(EdgeHeaders.BotInfoIdentity, 'verified')
      request.headers.set(EdgeHeaders.BotInfoName, 'Fingerprint Agent')
      request.headers.set(EdgeHeaders.BotInfoProvider, 'Fingerprint')
      request.headers.set(EdgeHeaders.IpV4Address, '10.0.0.10')
      request.headers.set(EdgeHeaders.IpV6Address, '::1')
      const ctx = createExecutionContext()

      const env = {
        ...mockEnv,
        FP_EDGE_API: 'true',
      }

      const response = await handler.fetch(request, env, ctx)
      await waitOnExecutionContext(ctx)
      const html = await response.text()

      expect(fetch).toHaveBeenCalledTimes(2)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const edgeRequest = vi.mocked(fetch).mock.calls[0][0] as Request
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const originRequest = vi.mocked(fetch).mock.calls[1][0] as Request
      expect(edgeRequest).toBeInstanceOf(Request)
      expect(originRequest).toBeInstanceOf(Request)
      const edgeRequestBody = await edgeRequest.json()
      expect(edgeRequestBody).toEqual({
        headers: [
          {
            name: 'cf-connecting-ip',
            value: '94.142.239.124',
          },
          {
            name: EdgeHeaders.BotInfoCategory,
            value: 'ai_agent',
          },
          {
            name: EdgeHeaders.BotInfoIdentity,
            value: 'verified',
          },
          {
            name: EdgeHeaders.BotInfoName,
            value: 'Fingerprint Agent',
          },
          {
            name: EdgeHeaders.BotInfoProvider,
            value: 'Fingerprint',
          },
          {
            name: EdgeHeaders.IpV4Address,
            value: '10.0.0.10',
          },
          {
            name: EdgeHeaders.IpV6Address,
            value: '::1',
          },
        ],
        url: request.url,
        ipv4_address: '94.142.239.124',
        ipv6_address: undefined,
        method: request.method,
      })

      expect(html).toContain('<script defer src="/scripts/instrumentor.iife.js"></script>')
    })
  })
})
