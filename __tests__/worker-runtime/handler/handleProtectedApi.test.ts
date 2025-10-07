import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SIGNALS_HEADER } from '../../../src/shared/const'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import handler from '../../../src/worker'
import { CloudflareRequest } from '../request'
import { env } from 'cloudflare:workers'
import { TypedEnv } from '../../../src/worker/types'
import { Region } from '../../../src/worker/fingerprint/region'

type PrepareMockFetchParams = {
  mockIngressHandler: (request: Request) => Promise<Response>
  mockOriginHandler: () => Promise<Response>
}

function prepareMockFetch({ mockIngressHandler, mockOriginHandler }: PrepareMockFetchParams) {
  let ingressRequest: Request | undefined

  vi.mocked(fetch).mockImplementation(async (...params) => {
    // Mock ingress response
    if (params[0] instanceof Request && params[0].url.includes('api.fpjs.io')) {
      ingressRequest = params[0]

      return mockIngressHandler(params[0])
    }

    return mockOriginHandler()
  })

  return {
    getIngressRequest: () => ingressRequest,
  }
}

function checkIngressRequest<CfHostMetadata>(
  ingressRequest: Request<unknown, CfProperties<CfHostMetadata>> | undefined
) {
  expect(ingressRequest).toBeTruthy()
  expect(ingressRequest!.url).toEqual('https://api.fpjs.io/send')
  expect(ingressRequest!.method).toEqual('POST')
}

describe('Protected API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(globalThis, 'fetch')
  })

  it('should return empty 403 response if ingress request fails', async () => {
    prepareMockFetch({
      mockIngressHandler: async () => {
        return new Response(
          JSON.stringify({
            v: '2',
            requestId: '1234',
            error: {
              code: 'RequestCannotBeParsed',
              message: 'bad request',
            },
            products: {},
          }),
          {
            status: 400,
          }
        )
      },
      mockOriginHandler: async () =>
        new Response('origin', {
          headers: {
            // Origin cookies, should be sent together with cookies from ingress
            'Set-Cookie': 'origin-cookie=value',
          },
        }),
    })

    const requestHeaders = new Headers({
      [SIGNALS_HEADER]: 'signals',
      'cf-connecting-ip': '1.2.3.4',
      host: 'example.com',
      'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
      'x-custom-header': 'custom-value',
    })

    const request = new CloudflareRequest('https://example.com/api', {
      method: 'POST',
      headers: requestHeaders,
    })
    const ctx = createExecutionContext()
    const response = await handler.fetch(request, env as TypedEnv)
    await waitOnExecutionContext(ctx)

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

    expect(response.status).toEqual(403)
    expect(await response.text()).toEqual('')
  })

  it('should return empty 403 response if signals are missing', async () => {
    const requestHeaders = new Headers({
      'cf-connecting-ip': '1.2.3.4',
      host: 'example.com',
      'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
      'x-custom-header': 'custom-value',
    })

    const request = new CloudflareRequest('https://example.com/api', {
      method: 'POST',
      headers: requestHeaders,
    })
    const ctx = createExecutionContext()
    const response = await handler.fetch(request, env as TypedEnv)
    await waitOnExecutionContext(ctx)

    expect(response.status).toEqual(403)
    expect(await response.text()).toEqual('')
  })

  it('should return empty 403 response if agent data is missing in response', async () => {
    prepareMockFetch({
      mockIngressHandler: async () => {
        return new Response(
          JSON.stringify({
            v: '2',
            requestId: '1234',
            error: {
              code: 'RequestCannotBeParsed',
              message: 'bad request',
            },
            products: {},
          }),
          {
            status: 200,
          }
        )
      },
      mockOriginHandler: async () =>
        new Response('origin', {
          headers: {
            // Origin cookies, should be sent together with cookies from ingress
            'Set-Cookie': 'origin-cookie=value',
          },
        }),
    })

    const requestHeaders = new Headers({
      'cf-connecting-ip': '1.2.3.4',
      host: 'example.com',
      'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
      'x-custom-header': 'custom-value',
    })

    const request = new CloudflareRequest('https://example.com/api', {
      method: 'POST',
      headers: requestHeaders,
    })
    const ctx = createExecutionContext()
    const response = await handler.fetch(request, env as TypedEnv)
    await waitOnExecutionContext(ctx)

    expect(response.status).toEqual(403)
    expect(await response.text()).toEqual('')
  })

  it.each(['cf-connecting-ip', 'host', 'user-agent'])(
    'should return empty 403 response if one of ingress required header %s is missing',
    async (header) => {
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              v: '2',
              requestId: '1234',
              error: {
                code: 'RequestCannotBeParsed',
                message: 'bad request',
              },
              products: {},
            }),
            {
              status: 400,
            }
          )
        },
        mockOriginHandler: async () =>
          new Response('origin', {
            headers: {
              // Origin cookies, should be sent together with cookies from ingress
              'Set-Cookie': 'origin-cookie=value',
            },
          }),
      })

      const requestHeaders = new Headers({
        [SIGNALS_HEADER]: 'signals',
        'cf-connecting-ip': '1.2.3.4',
        host: 'example.com',
        'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        'x-custom-header': 'custom-value',
      })
      requestHeaders.delete(header)

      const request = new CloudflareRequest('https://example.com/api', {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, env as TypedEnv)
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(0)

      expect(response.status).toEqual(403)
      expect(await response.text()).toEqual('')
    }
  )

  it('should send request to ingress and return modified response', async () => {
    const { getIngressRequest } = prepareMockFetch({
      mockIngressHandler: async () => {
        const headers = new Headers()
        headers.append('Set-Cookie', 'fp-ingress-cookie=12345')
        headers.append(
          'Set-Cookie',
          '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None'
        )

        return new Response(
          JSON.stringify({
            agentData: 'agent-data',
          }),
          {
            headers,
          }
        )
      },
      mockOriginHandler: async () =>
        new Response('origin', {
          headers: {
            // Origin cookies, should be sent together with cookies from ingress
            'Set-Cookie': 'origin-cookie=value',
          },
        }),
    })

    const requestHeaders = new Headers({
      [SIGNALS_HEADER]: 'signals',
      'cf-connecting-ip': '1.2.3.4',
      host: 'example.com',
      'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
      'x-custom-header': 'custom-value',
    })

    // Add client cookie that should not be sent to ingress
    requestHeaders.append('cookie', 'client-cookie=value;')
    // Add _iidt cookie to the request headers, it should not be included in the ingress request
    requestHeaders.append('cookie', '_iidt=123456;')
    // Add another client cookie that should not be sent to ingress
    requestHeaders.append('cookie', 'another-client-cookie=value')

    const request = new CloudflareRequest('https://example.com/api', {
      method: 'POST',
      headers: requestHeaders,
    })
    const ctx = createExecutionContext()
    const response = await handler.fetch(request, env as TypedEnv)
    await waitOnExecutionContext(ctx)

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

    expect(response.status).toEqual(200)
    expect(await response.text()).toEqual('origin')

    const ingressRequest = getIngressRequest()
    checkIngressRequest(ingressRequest)

    const ingressBody = await ingressRequest!.json()
    expect(ingressBody).toEqual({
      // Only _iidt cookie should be sent to ingress
      clientCookie: '_iidt=123456',
      clientHeaders: {
        'cf-connecting-ip': '1.2.3.4',
        'fp-data': 'signals',
        host: 'example.com',
        'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        'x-custom-header': 'custom-value',
      },
      clientHost: 'example.com',
      clientIP: '1.2.3.4',
      clientUserAgent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
      fingerprintData: 'signals',
    })

    const setCookie = response.headers.getAll('Set-Cookie')
    expect(setCookie).toHaveLength(3)
    // Cookies received from ingress and origin
    expect(setCookie).toEqual(
      expect.arrayContaining([
        'origin-cookie=value',
        'fp-ingress-cookie=12345',
        '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
      ])
    )
  })

  it('should send request to ingress and return modified response when client request has no cookies', async () => {
    const { getIngressRequest } = prepareMockFetch({
      mockIngressHandler: async () => {
        const headers = new Headers()
        headers.append(
          'Set-Cookie',
          '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None'
        )

        return new Response(
          JSON.stringify({
            agentData: 'agent-data',
          }),
          {
            headers,
          }
        )
      },
      mockOriginHandler: async () => new Response('origin'),
    })

    const requestHeaders = new Headers({
      [SIGNALS_HEADER]: 'signals',
      'cf-connecting-ip': '1.2.3.4',
      host: 'example.com',
      'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
      'x-custom-header': 'custom-value',
    })

    const request = new CloudflareRequest('https://example.com/api', {
      method: 'POST',
      headers: requestHeaders,
    })
    const ctx = createExecutionContext()
    const response = await handler.fetch(request, env as TypedEnv)
    await waitOnExecutionContext(ctx)

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

    expect(response.status).toEqual(200)
    expect(await response.text()).toEqual('origin')

    const ingressRequest = getIngressRequest()
    checkIngressRequest(ingressRequest)

    const ingressBody = await ingressRequest!.json()
    expect(ingressBody).toEqual({
      clientHeaders: {
        'cf-connecting-ip': '1.2.3.4',
        'fp-data': 'signals',
        host: 'example.com',
        'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        'x-custom-header': 'custom-value',
      },
      clientHost: 'example.com',
      clientIP: '1.2.3.4',
      clientUserAgent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
      fingerprintData: 'signals',
    })

    const setCookie = response.headers.getAll('Set-Cookie')
    expect(setCookie).toHaveLength(1)
    expect(setCookie).toEqual(
      expect.arrayContaining([
        '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
      ])
    )
  })

  it.each<{
    region: Region
    expectedIngressHost: string
  }>([
    {
      region: 'eu',
      expectedIngressHost: 'https://eu.api.fpjs.io',
    },
    {
      region: 'us',
      expectedIngressHost: 'https://api.fpjs.io',
    },
  ])('should send request to ingress in a different region', async ({ region, expectedIngressHost }) => {
    const { getIngressRequest } = prepareMockFetch({
      mockIngressHandler: async () => {
        const headers = new Headers()
        headers.append(
          'Set-Cookie',
          '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None'
        )

        return new Response(
          JSON.stringify({
            agentData: 'agent-data',
          }),
          {
            headers,
          }
        )
      },
      mockOriginHandler: async () => new Response('origin'),
    })

    const request = new CloudflareRequest('https://example.com/api', {
      method: 'POST',
      headers: {
        [SIGNALS_HEADER]: 'signals',
        'cf-connecting-ip': '1.2.3.4',
        host: 'example.com',
        'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
      },
    })
    const ctx = createExecutionContext()
    await handler.fetch(request, {
      ...env,
      FP_REGION: region,
    } as TypedEnv)
    await waitOnExecutionContext(ctx)

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

    const ingressRequest = getIngressRequest()
    expect(ingressRequest).toBeTruthy()
    expect(ingressRequest!.url).toEqual(`${expectedIngressHost}/send`)
  })
})
