/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import assert from 'node:assert/strict'
import { AGENT_DATA_HEADER, SIGNALS_KEY } from '../../../src/shared/const'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import handler from '../../../src/worker'
import { CloudflareRequest } from '../request'
import { Region } from '../../../src/worker/fingerprint/region'
import { SendBody, SendResponse } from '../../../src/worker/fingerprint/identificationClient'
import { mockEnv, mockUrl, mockWorkerBaseUrl } from '../../utils/mockEnv'
import { TypedEnv } from '../../../src/worker/types'

type PrepareMockFetchParams = {
  mockIngressHandler: (request: Request) => Promise<Response>
  mockOriginHandler: () => Promise<Response>
}

function prepareMockFetch({ mockIngressHandler, mockOriginHandler }: PrepareMockFetchParams) {
  let ingressRequest: Request | undefined
  let originRequest: Request | undefined

  vi.mocked(fetch).mockImplementation(async (...params) => {
    // Mock ingress response
    if (params[0] instanceof Request) {
      if (params[0].url.includes('api.fpjs.io')) {
        ingressRequest = params[0]

        return mockIngressHandler(params[0])
      }

      originRequest = params[0]

      const response = await mockOriginHandler()

      // The Workers runtime prevents modification of headers received
      // from the network. Ensure that tests can trigger this error
      // if that happens
      const throwImmutableHeadersError = () => {
        throw new TypeError("Can't modify immutable headers")
      }
      Object.defineProperties(response.headers, {
        set: { value: throwImmutableHeadersError },
        append: { value: throwImmutableHeadersError },
        delete: { value: throwImmutableHeadersError },
      })
      return response
    }

    return new Response('', { status: 404 })
  })

  return {
    getIngressRequest: () => ingressRequest,
    getOriginRequest: () => originRequest,
  }
}

function checkIngressRequest<CfHostMetadata>(
  ingressRequest: Request<unknown, CfProperties<CfHostMetadata>> | undefined
) {
  expect(ingressRequest).toBeTruthy()
  expect(ingressRequest!.url).toEqual('https://api.fpjs.io/v4/send')
  expect(ingressRequest!.method).toEqual('POST')
}

function mockEvent(): SendResponse['event'] {
  return {
    url: mockUrl('/'),
    ip_address: '1.2.3.4',
    timestamp: new Date(),
    replayed: false,
  }
}

function getCompleteHeaders() {
  return new Headers({
    [SIGNALS_KEY]: 'signals',
    'cf-connecting-ip': '1.2.3.4',
    host: new URL(mockUrl('/')).host,
    origin: mockUrl('/'),
    'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
    'x-custom-header': 'custom-value',
  })
}

describe('Protected API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(globalThis, 'fetch')
  })

  describe('Response modification', () => {
    it.each(['application/x-www-form-urlencoded', 'application/x-www-form-urlencoded; charset=UTF-8'])(
      'should send request with signals as %s to ingress and return modified response',
      async (contentType) => {
        const { getIngressRequest, getOriginRequest } = prepareMockFetch({
          mockIngressHandler: async () => {
            const headers = new Headers()
            headers.append('Set-Cookie', 'ignored-set-cookie=123')

            return new Response(
              JSON.stringify({
                agent_data: 'agent-data',
                set_cookie_headers: [
                  '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                  'fp-ingress-cookie=12345',
                ],
                event: mockEvent(),
              } satisfies SendResponse),
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

        const requestHeaders = getCompleteHeaders()
        requestHeaders.delete(SIGNALS_KEY)
        requestHeaders.set('Content-Type', contentType)

        const cookies = 'client-cookie=value; another-client-cookie=value; _iidt=123456;'
        requestHeaders.append('cookie', cookies)

        const body = `login=login&password=password&${SIGNALS_KEY}=signals`

        const request = new CloudflareRequest(mockUrl('/api/test'), {
          method: 'POST',
          headers: requestHeaders,
          body,
        })
        const ctx = createExecutionContext()
        const response = await handler.fetch(
          request,
          {
            ...mockEnv,
            FP_FAILURE_FALLBACK_ACTION: {
              type: 'allow',
            },
          },
          ctx
        )
        await waitOnExecutionContext(ctx)

        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

        expect(response.status).toEqual(200)
        expect(await response.text()).toEqual('origin')

        const ingressRequest = getIngressRequest()
        checkIngressRequest(ingressRequest)

        const ingressBody = await ingressRequest!.json()
        expect(ingressBody).toEqual({
          // Only _iidt cookie should be sent to ingress
          client_cookie: '_iidt=123456',
          client_headers: {
            'cf-connecting-ip': '1.2.3.4',
            'content-type': contentType,
            host: 'example.com',
            origin: 'https://example.com/',
            'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
            'x-custom-header': 'custom-value',
          },
          client_host: 'example.com',
          client_ip: '1.2.3.4',
          client_user_agent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
          fingerprint_data: 'signals',
          ruleset_context: {
            ruleset_id: 'r_1',
          },
        } satisfies SendBody)

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

        const originBody = await getOriginRequest()!.formData()
        expect(originBody.has(SIGNALS_KEY)).toBeFalsy()
      }
    )

    it('should send request with signals in headers to ingress and return modified response', async () => {
      const { getIngressRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          const headers = new Headers()
          headers.append('Set-Cookie', 'ignored-set-cookie=123')

          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse),
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

      const requestHeaders = getCompleteHeaders()

      const cookies = 'client-cookie=value; another-client-cookie=value; _iidt=123456;'
      requestHeaders.append('cookie', cookies)

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
          },
        },
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')
      expect(response.headers.get(AGENT_DATA_HEADER)).toEqual('agent-data')

      const ingressRequest = getIngressRequest()
      checkIngressRequest(ingressRequest)

      const ingressBody = await ingressRequest!.json()
      expect(ingressBody).toEqual({
        // Only _iidt cookie should be sent to ingress
        client_cookie: '_iidt=123456',
        client_headers: {
          'cf-connecting-ip': '1.2.3.4',
          host: 'example.com',
          origin: 'https://example.com/',
          'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
          'x-custom-header': 'custom-value',
        },
        client_host: 'example.com',
        client_ip: '1.2.3.4',
        client_user_agent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        fingerprint_data: 'signals',
        ruleset_context: {
          ruleset_id: 'r_1',
        },
      } satisfies SendBody)

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

    it('should not modify response if the sec-fetch-dest is a document', async () => {
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
              agent_data: 'agent-data',
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

      const requestHeaders = getCompleteHeaders()
      requestHeaders.set('Sec-Fetch-Dest', 'document')

      const cookies = 'client-cookie=value; another-client-cookie=value; _iidt=123456;'
      requestHeaders.append('cookie', cookies)

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
          },
        },
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')
      expect(response.headers.get(AGENT_DATA_HEADER)).toBeNull()

      const ingressRequest = getIngressRequest()
      checkIngressRequest(ingressRequest)

      const ingressBody = await ingressRequest!.json()
      expect(ingressBody).toEqual({
        // Only _iidt cookie should be sent to ingress
        client_cookie: '_iidt=123456',
        client_headers: {
          'cf-connecting-ip': '1.2.3.4',
          'sec-fetch-dest': 'document',
          host: 'example.com',
          origin: 'https://example.com/',
          'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
          'x-custom-header': 'custom-value',
        },
        client_host: 'example.com',
        client_ip: '1.2.3.4',
        client_user_agent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        fingerprint_data: 'signals',
        ruleset_context: {
          ruleset_id: 'r_1',
        },
      } satisfies SendBody)

      const setCookie = response.headers.getAll('Set-Cookie')
      expect(setCookie).toHaveLength(1)
      // Cookies received from ingress and origin
      expect(setCookie).toEqual(expect.arrayContaining(['origin-cookie=value']))
    })

    it('should send request with signals as multipart/form-data to ingress and return modified response', async () => {
      const { getIngressRequest, getOriginRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          const headers = new Headers()
          headers.append('Set-Cookie', 'ignored-set-cookie=123')

          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'allow',
                request_header_modifications: {},
                rule_id: '1',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse),
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

      const requestHeaders = getCompleteHeaders()
      requestHeaders.delete(SIGNALS_KEY)

      const cookies = 'client-cookie=value; another-client-cookie=value; _iidt=123456;'
      requestHeaders.append('cookie', cookies)

      const formData = new FormData()
      formData.append('login', 'login')
      formData.append('password', 'password')
      formData.append(SIGNALS_KEY, 'signals')

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
        body: formData,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
          },
        },
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')

      const ingressRequest = getIngressRequest()
      checkIngressRequest(ingressRequest)

      const ingressBody = await ingressRequest!.json()
      expect(ingressBody).toEqual({
        // Only _iidt cookie should be sent to ingress
        client_cookie: '_iidt=123456',
        client_headers: {
          'cf-connecting-ip': '1.2.3.4',
          'content-type': expect.stringContaining('multipart/form-data'),
          host: 'example.com',
          origin: 'https://example.com/',
          'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
          'x-custom-header': 'custom-value',
        },
        client_host: 'example.com',
        client_ip: '1.2.3.4',
        client_user_agent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        fingerprint_data: 'signals',
        ruleset_context: {
          ruleset_id: 'r_1',
        },
      } satisfies SendBody)

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

      const originBody = await getOriginRequest()!.formData()
      expect(originBody.has(SIGNALS_KEY)).toBeFalsy()
    })

    it('should send request to ingress and return modified response when client request has no cookies', async () => {
      const { getIngressRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
          )
        },
        mockOriginHandler: async () => new Response('origin'),
      })

      const requestHeaders = getCompleteHeaders()

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
          },
        },
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')

      const ingressRequest = getIngressRequest()
      checkIngressRequest(ingressRequest)

      const ingressBody = await ingressRequest!.json()
      expect(ingressBody).toEqual({
        client_headers: {
          'cf-connecting-ip': '1.2.3.4',
          host: 'example.com',
          origin: 'https://example.com/',
          'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
          'x-custom-header': 'custom-value',
        },
        client_host: 'example.com',
        client_ip: '1.2.3.4',
        client_user_agent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        fingerprint_data: 'signals',
        ruleset_context: {
          ruleset_id: 'r_1',
        },
      } satisfies SendBody)

      const setCookie = response.headers.getAll('Set-Cookie')
      expect(setCookie).toHaveLength(1)
      expect(setCookie).toEqual(
        expect.arrayContaining([
          '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
        ])
      )
    })
  })

  describe('Agent processor script injection', () => {
    const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head></head>
    <body>
      <main>
      Hello world
    </main>
    </body>
    </html>
    `

    it('should inject agent processor script if response is HTML', async () => {
      const { getIngressRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'allow',
                request_header_modifications: {},
                rule_id: '1',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
          )
        },
        mockOriginHandler: async () =>
          new Response(sampleHtml, {
            headers: {
              'Content-Type': 'text/html',
            },
          }),
      })

      const requestHeaders = getCompleteHeaders()
      requestHeaders.append('Sec-Fetch-Dest', 'document')

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toMatchInlineSnapshot(`
      "
          <!DOCTYPE html>
          <html>
          <head><script data-agent-data="agent-data" async src="/scripts/agent-processor.iife.js"></script>
      </head>
          <body>
            <main>
            Hello world
          </main>
          </body>
          </html>
          "
    `)

      const ingressRequest = getIngressRequest()
      checkIngressRequest(ingressRequest)

      const ingressBody = await ingressRequest!.json()
      expect(ingressBody).toEqual({
        client_headers: {
          'cf-connecting-ip': '1.2.3.4',
          'sec-fetch-dest': 'document',
          host: 'example.com',
          origin: 'https://example.com/',
          'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
          'x-custom-header': 'custom-value',
        },
        client_host: 'example.com',
        client_ip: '1.2.3.4',
        client_user_agent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        fingerprint_data: 'signals',
        ruleset_context: {
          ruleset_id: 'r_1',
        },
      } satisfies SendBody)
    })

    it('should not inject agent processor script if response is HTML and sec-fetch-dest is not a document', async () => {
      const { getIngressRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'allow',
                request_header_modifications: {},
                rule_id: '1',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
          )
        },
        mockOriginHandler: async () =>
          new Response(sampleHtml, {
            headers: {
              'Content-Type': 'text/html',
            },
          }),
      })

      const requestHeaders = getCompleteHeaders()
      requestHeaders.append('Sec-Fetch-Dest', 'script')

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toMatchInlineSnapshot(`
      "
          <!DOCTYPE html>
          <html>
          <head></head>
          <body>
            <main>
            Hello world
          </main>
          </body>
          </html>
          "
    `)

      const ingressRequest = getIngressRequest()
      checkIngressRequest(ingressRequest)

      const ingressBody = await ingressRequest!.json()
      expect(ingressBody).toEqual({
        client_headers: {
          'cf-connecting-ip': '1.2.3.4',
          'sec-fetch-dest': 'script',
          host: 'example.com',
          origin: 'https://example.com/',
          'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
          'x-custom-header': 'custom-value',
        },
        client_host: 'example.com',
        client_ip: '1.2.3.4',
        client_user_agent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        fingerprint_data: 'signals',
        ruleset_context: {
          ruleset_id: 'r_1',
        },
      } satisfies SendBody)
    })

    it('should inject agent processor script if blocked response is HTML', async () => {
      const { getIngressRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'block',
                headers: [
                  {
                    name: 'content-type',
                    value: 'text/html',
                  },
                ],
                body: sampleHtml,
                status_code: 200,
                rule_id: '1',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
          )
        },
        mockOriginHandler: async () => new Response('origin', {}),
      })

      const requestHeaders = getCompleteHeaders()
      requestHeaders.append('Sec-Fetch-Dest', 'document')

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

      expect(response.status).toEqual(200)
      expect(await response.text()).toMatchInlineSnapshot(`
      "
          <!DOCTYPE html>
          <html>
          <head><script data-agent-data="agent-data" async src="/scripts/agent-processor.iife.js"></script>
      </head>
          <body>
            <main>
            Hello world
          </main>
          </body>
          </html>
          "
    `)

      const ingressRequest = getIngressRequest()
      checkIngressRequest(ingressRequest)

      const ingressBody = await ingressRequest!.json()
      expect(ingressBody).toEqual({
        client_headers: {
          'cf-connecting-ip': '1.2.3.4',
          'sec-fetch-dest': 'document',
          host: 'example.com',
          origin: 'https://example.com/',
          'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
          'x-custom-header': 'custom-value',
        },
        client_host: 'example.com',
        client_ip: '1.2.3.4',
        client_user_agent: 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        fingerprint_data: 'signals',
        ruleset_context: {
          ruleset_id: 'r_1',
        },
      } satisfies SendBody)
    })
  })

  describe('Ruleset enforcement', () => {
    it('should send request to ingress and block request if ruleset says so', async () => {
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'block',
                headers: [
                  {
                    name: 'x-blocked',
                    value: 'true',
                  },
                ],
                status_code: 403,
                body: 'Not allowed',
                rule_expression: '',
                rule_id: '12',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
          )
        },
        mockOriginHandler: async () => new Response('origin'),
      })

      const requestHeaders = new Headers({
        [SIGNALS_KEY]: 'signals',
        'cf-connecting-ip': '1.2.3.4',
        host: 'example.com',
        origin: mockUrl('/'),
        'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        'x-custom-header': 'custom-value',
      })

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      // Only one request to ingress should be made
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

      expect(response.status).toEqual(403)
      expect(await response.text()).toEqual('Not allowed')
      expect(response.headers.get('x-blocked')).toEqual('true')
    })

    it('should send cross-origin request to ingress and block request with CORS headers', async () => {
      const identificationPageUrl = new URL('https://app.example.com/page')
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'block',
                headers: [
                  {
                    name: 'x-blocked',
                    value: 'true',
                  },
                ],
                status_code: 403,
                body: 'Not allowed',
                rule_expression: '',
                rule_id: '12',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: {
                ...mockEvent(),
                url: identificationPageUrl.toString(),
              },
            } satisfies SendResponse)
          )
        },
        mockOriginHandler: async () => new Response('origin'),
      })

      const requestHeaders = new Headers({
        [SIGNALS_KEY]: 'signals',
        'cf-connecting-ip': '1.2.3.4',
        host: 'example.com',
        origin: identificationPageUrl.origin,
        'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        'x-custom-header': 'custom-value',
      })

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          IDENTIFICATION_PAGE_URLS: [...mockEnv.IDENTIFICATION_PAGE_URLS, identificationPageUrl.toString()],
        },
        ctx
      )
      await waitOnExecutionContext(ctx)

      // Only one request to ingress should be made
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

      expect(response.status).toEqual(403)
      expect(await response.text()).toEqual('Not allowed')
      expect(response.headers.get('x-blocked')).toEqual('true')
      expect(response.headers.get('Access-Control-Allow-Origin')).toEqual('https://app.example.com')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toEqual('true')
      expect(response.headers.get('Access-Control-Expose-Headers')).toEqual(AGENT_DATA_HEADER)
    })

    it('should send request to ingress and modify the request if ruleset says so', async () => {
      const originResponse = new Response('origin')
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'allow',
                request_header_modifications: {
                  set: [
                    {
                      name: 'x-allowed',
                      value: 'true',
                    },
                  ],
                },
                rule_expression: '',
                rule_id: '12',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
          )
        },
        mockOriginHandler: async () => originResponse,
      })

      const requestHeaders = new Headers({
        [SIGNALS_KEY]: 'signals',
        'cf-connecting-ip': '1.2.3.4',
        host: 'example.com',
        origin: mockUrl('/'),
        'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        'x-custom-header': 'custom-value',
      })

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      const originRequest = vi.mocked(fetch).mock.calls[1][0] as Request
      expect(originRequest).toBeInstanceOf(Request)
      expect(originRequest.headers.get('x-allowed')).toEqual('true')

      // Assert that the response from origin is not modified based on the ruleset
      expect(await response.text()).toEqual('origin')
      const responseHeaders = Array.from(response.headers)
      expect(responseHeaders).toHaveLength(4)
      expect(responseHeaders).toEqual(
        expect.arrayContaining([
          ['content-type', 'text/plain;charset=UTF-8'],
          ['fp-agent-data', 'agent-data'],
          ['set-cookie', 'fp-ingress-cookie=12345'],
          [
            'set-cookie',
            '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
          ],
        ])
      )
    })

    it('should evaluate fallback rule if ingress request fails', async () => {
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

      const requestHeaders = getCompleteHeaders()

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

      expect(response.status).toEqual(403)
      expect(await response.text()).toEqual('fallback block')
    })

    it('should evaluate fallback rule if request body json parse fails', async () => {
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'allow',
                request_header_modifications: {
                  set: [
                    {
                      name: 'x-allowed',
                      value: 'true',
                    },
                  ],
                },
                rule_expression: '',
                rule_id: '12',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
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

      const requestHeaders = getCompleteHeaders()
      requestHeaders.append('content-type', 'application/json')
      requestHeaders.delete(SIGNALS_KEY)

      const data = {
        login: 'login',
        password: '',
      }

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
        // Simulate invalid JSON body
        body: JSON.stringify(data).slice(0, 5),
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'block',
            status_code: 403,
            body: 'fallback block',
          },
        } satisfies TypedEnv,
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(0)

      expect(response.status).toEqual(403)
      expect(await response.text()).toEqual('fallback block')
    })

    it('should evaluate fallback rule if request body form data parse fails', async () => {
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'allow',
                request_header_modifications: {
                  set: [
                    {
                      name: 'x-allowed',
                      value: 'true',
                    },
                  ],
                },
                rule_expression: '',
                rule_id: '12',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
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

      const requestHeaders = getCompleteHeaders()
      // By setting the multipart/form-data explicitly here, the request will miss the boundary parameter
      requestHeaders.append('content-type', 'multipart/form-data')
      requestHeaders.delete(SIGNALS_KEY)

      const data = new FormData()
      data.append('login', 'login')
      data.append('password', '')

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
        // Simulate invalid JSON body
        body: data,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'block',
            status_code: 403,
            body: 'fallback block',
          },
        } satisfies TypedEnv,
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(0)

      expect(response.status).toEqual(403)
      expect(await response.text()).toEqual('fallback block')
    })

    it('should evaluate fallback rule if ingress request fails - allow case', async () => {
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

      const requestHeaders = getCompleteHeaders()

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
          },
        },
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')
    })

    it('should evaluate fallback rule if response if signals are missing', async () => {
      const requestHeaders = getCompleteHeaders()
      requestHeaders.delete(SIGNALS_KEY)

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(response.status).toEqual(403)
      expect(await response.text()).toEqual('fallback block')
    })

    it('should evaluate fallback rule if agent data is missing in response', async () => {
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              // agentData field is missing
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

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, mockEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(response.status).toEqual(403)
      expect(await response.text()).toEqual('fallback block')
    })

    it.each(['cf-connecting-ip', 'host', 'user-agent'])(
      'should evaluate fallback rule response if one of ingress required header %s is missing',
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

        const requestHeaders = getCompleteHeaders()
        requestHeaders.delete(header)

        const request = new CloudflareRequest(mockUrl('/api/test'), {
          method: 'POST',
          headers: requestHeaders,
        })
        const ctx = createExecutionContext()
        const response = await handler.fetch(request, mockEnv, ctx)
        await waitOnExecutionContext(ctx)

        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(0)

        expect(response.status).toEqual(403)
        expect(await response.text()).toEqual('fallback block')
      }
    )
  })

  describe('Identification regions', () => {
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

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: {
          [SIGNALS_KEY]: 'signals',
          'cf-connecting-ip': '1.2.3.4',
          host: 'example.com',
          'user-agent': 'Mozilla/5.0 (platform; rv:gecko-version) Gecko/gecko-trail Firefox/firefox-version',
        },
      })
      const ctx = createExecutionContext()
      await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
          },
          FP_REGION: region,
        },
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      const ingressRequest = getIngressRequest()
      expect(ingressRequest).toBeTruthy()
      expect(ingressRequest!.url).toEqual(`${expectedIngressHost}/v4/send`)
    })
  })

  describe('Monitor mode', () => {
    it('should not evaluate fallback rule when ingress request fails', async () => {
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

      const requestHeaders = getCompleteHeaders()

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          // includes fallback action not executed because worker is in monitor mode
          ...mockEnv,
          FP_RULESET_ID: '',
        } satisfies TypedEnv,
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')
    })

    it('should not evaluate fallback rule if response signals are missing', async () => {
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

      const requestHeaders = getCompleteHeaders()
      requestHeaders.delete(SIGNALS_KEY)

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_RULESET_ID: '',
        } satisfies TypedEnv,
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(fetch).toHaveBeenCalledTimes(1)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')
    })

    it('should not evaluate fallback rule if request body form data parse fails', async () => {
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              rule_action: {
                type: 'allow',
                request_header_modifications: {
                  set: [
                    {
                      name: 'x-allowed',
                      value: 'true',
                    },
                  ],
                },
                rule_expression: '',
                rule_id: '12',
                ruleset_id: '1',
              },
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
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

      const requestHeaders = getCompleteHeaders()
      // By setting the multipart/form-data explicitly here, the request will miss the boundary parameter
      requestHeaders.append('content-type', 'multipart/form-data')
      requestHeaders.delete(SIGNALS_KEY)

      const data = new FormData()
      data.append('login', 'login')
      data.append('password', '')

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
        body: data,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          ...mockEnv,
          FP_RULESET_ID: '',
        } satisfies TypedEnv,
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')
    })

    it.each(['cf-connecting-ip', 'host', 'user-agent'])(
      'should not evaluate fallback rule response if one of ingress required header %s is missing',
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

        const requestHeaders = getCompleteHeaders()
        requestHeaders.delete(header)

        const request = new CloudflareRequest(mockUrl('/api/test'), {
          method: 'POST',
          headers: requestHeaders,
        })
        const ctx = createExecutionContext()
        const response = await handler.fetch(
          request,
          {
            ...mockEnv,
            FP_RULESET_ID: '',
          } satisfies TypedEnv,
          ctx
        )
        await waitOnExecutionContext(ctx)

        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

        expect(response.status).toEqual(200)
        expect(await response.text()).toEqual('origin')
      }
    )

    it('should forward the request to the origin after a successful ingress', async () => {
      prepareMockFetch({
        mockIngressHandler: async () => {
          return new Response(
            JSON.stringify({
              agent_data: 'agent-data',
              set_cookie_headers: [
                '_iidt=123456; Path=/; Domain=example.com; Expires=Fri, 20 Feb 2026 13:55:06 GMT; HttpOnly; Secure; SameSite=None',
                'fp-ingress-cookie=12345',
              ],
              event: mockEvent(),
            } satisfies SendResponse)
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

      const requestHeaders = getCompleteHeaders()

      const request = new CloudflareRequest(mockUrl('/api/test'), {
        method: 'POST',
        headers: requestHeaders,
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(
        request,
        {
          // includes fallback action not executed because worker is in monitor mode
          ...mockEnv,
          FP_RULESET_ID: '',
        } satisfies TypedEnv,
        ctx
      )
      await waitOnExecutionContext(ctx)

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

      expect(response.status).toEqual(200)
      expect(await response.text()).toEqual('origin')
    })
  })

  describe('CORS handling', () => {
    const apiUrl = 'https://api.example.com/test'
    const crossOriginApiEnv: TypedEnv = {
      ...mockEnv,
      PROTECTED_APIS: [
        {
          url: apiUrl,
          method: 'POST',
        },
      ],
    }

    it('should respond with 204 for preflight triggered by instrumentation', async () => {
      const { getOriginRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          throw new Error('Should not be called')
        },
        mockOriginHandler: async () => {
          throw new Error('Should not be called')
        },
      })

      const request = new CloudflareRequest(apiUrl, {
        method: 'OPTIONS',
        headers: new Headers({
          'Access-Control-Request-Headers': SIGNALS_KEY,
          'Access-Control-Request-Method': 'POST',
          origin: mockWorkerBaseUrl,
        }),
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, crossOriginApiEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(response.status).toEqual(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toEqual(mockWorkerBaseUrl)
      expect(response.headers.get('Access-Control-Allow-Headers')).toEqual(SIGNALS_KEY)
      expect(response.headers.get('Access-Control-Allow-Methods')).toEqual('POST')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toEqual('true')

      expect(getOriginRequest()).toBeUndefined()
    })

    it('should forward OPTIONS request to origin preflight triggered by app', async () => {
      const { getOriginRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          throw new Error('Should not be called')
        },
        mockOriginHandler: async () => {
          return new Response(null, {
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST',
              'Access-Control-Allow-Headers': 'content-type',
            },
          })
        },
      })

      const request = new CloudflareRequest(apiUrl, {
        method: 'OPTIONS',
        headers: new Headers({
          'Access-Control-Request-Headers': `content-type, ${SIGNALS_KEY}`,
          'Access-Control-Request-Method': 'POST',
          origin: mockWorkerBaseUrl,
        }),
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, crossOriginApiEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(response.status).toEqual(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toEqual(mockWorkerBaseUrl)
      expect(response.headers.get('Access-Control-Allow-Credentials')).toEqual('true')
      expect(response.headers.get('Access-Control-Allow-Headers')).toEqual(`content-type,${SIGNALS_KEY}`)
      expect(response.headers.get('Access-Control-Allow-Methods')).toEqual('POST')

      const originRequest = getOriginRequest()
      assert(originRequest)
      expect(originRequest.headers.get('Access-Control-Request-Headers')).toEqual('content-type')
    })

    it('should forward OPTIONS request to origin if signals preflight but origin not allowed', async () => {
      const { getOriginRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          throw new Error('Should not be called')
        },
        mockOriginHandler: async () => {
          return new Response(null, {
            status: 400,
            headers: {},
          })
        },
      })

      const request = new CloudflareRequest(apiUrl, {
        method: 'OPTIONS',
        headers: new Headers({
          'Access-Control-Request-Headers': SIGNALS_KEY,
          'Access-Control-Request-Method': 'POST',
          // Use an origin not in IDENTIFICATION_PAGE_URLS
          origin: 'https://not-allowed.example.com',
        }),
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, crossOriginApiEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(response.status).toEqual(400)

      const originRequest = getOriginRequest()
      expect(originRequest).toBeDefined()
      expect(originRequest!.headers.get('Access-Control-Request-Headers')).toBeNull()
    })

    it('should forward OPTIONS request to unmatched URL to origin', async () => {
      const { getOriginRequest } = prepareMockFetch({
        mockIngressHandler: async () => {
          throw new Error('Should not be called')
        },
        mockOriginHandler: async () => {
          return new Response(null, {
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': mockWorkerBaseUrl,
              'Access-Control-Allow-Headers': 'content-type',
              'Access-Control-Allow-Methods': 'PUT',
            },
          })
        },
      })

      const request = new CloudflareRequest(`${apiUrl}/v2`, {
        method: 'OPTIONS',
        headers: new Headers({
          'Access-Control-Request-Headers': 'content-type',
          'Access-Control-Request-Method': 'PUT',
          Origin: mockWorkerBaseUrl,
        }),
      })
      const ctx = createExecutionContext()
      const response = await handler.fetch(request, crossOriginApiEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(response.status).toEqual(204)

      const originRequest = getOriginRequest()
      expect(originRequest).toBeDefined()
      expect(originRequest!.headers.get('Access-Control-Request-Headers')).toEqual('content-type')
      expect(originRequest!.headers.get('Access-Control-Request-Method')).toEqual('PUT')
    })

    it.each([
      [
        'fallback allow',
        (async () =>
          new Response('origin', {
            headers: {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*',
            },
          })) satisfies () => Promise<Response>,
        {
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
          },
        } satisfies Partial<TypedEnv>,
        200,
        new Request(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            origin: mockWorkerBaseUrl,
            Cookie: 'name=value',
          },
        }),
        '*',
      ],
      [
        'fallback block',
        async () => {
          throw new Error('Should not have been called')
        },
        {} satisfies Partial<TypedEnv>,
        403,
        undefined,
        mockWorkerBaseUrl,
      ],
      [
        'monitor mode',
        (async () =>
          new Response('origin', {
            status: 201,
            headers: {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*',
            },
          })) satisfies () => Promise<Response>,
        {
          FP_RULESET_ID: '',
        } satisfies Partial<TypedEnv>,
        201,
        new Request(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            origin: mockWorkerBaseUrl,
            Cookie: 'name=value',
          },
        }),
        '*',
      ],
    ])(
      'should not set CORS headers when signals are not included in the request - %s',
      async (
        _name,
        mockOriginHandler,
        envUpdates,
        expectedStatusCode,
        expectedOriginRequest,
        expectedAllowedOrigin
      ) => {
        const { getOriginRequest } = prepareMockFetch({
          mockIngressHandler: async () => {
            throw new Error('Ingress failed')
          },
          mockOriginHandler,
        })

        const request = new CloudflareRequest(apiUrl, {
          method: 'POST',
          headers: new Headers({
            'Content-Type': 'text/plain',
            origin: mockWorkerBaseUrl,
            Cookie: 'name=value',
          }),
          body: 'content',
        })

        const testCaseEnv: TypedEnv = {
          ...crossOriginApiEnv,
          ...envUpdates,
        }

        const ctx = createExecutionContext()
        const response = await handler.fetch(request, testCaseEnv, ctx)
        await waitOnExecutionContext(ctx)

        expect(response.status).toEqual(expectedStatusCode)
        expect(response.headers.get('Access-Control-Allow-Origin')).toEqual(expectedAllowedOrigin)
        expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
        expect(response.headers.get('Access-Control-Expose-Headers')).toBeNull()

        expect(getOriginRequest()).toEqual(expectedOriginRequest)
      }
    )

    it.each([
      [
        'fallback allow',
        (async () =>
          new Response('origin', {
            headers: {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*',
            },
          })) satisfies () => Promise<Response>,
        {
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
          },
        } satisfies Partial<TypedEnv>,
        200,
        new Request(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            origin: mockWorkerBaseUrl,
          },
        }),
      ],
      [
        'fallback block',
        async () => {
          throw new Error('Should not have been called')
        },
        {} satisfies Partial<TypedEnv>,
        403,
        undefined,
      ],
      [
        'monitor mode',
        (async () =>
          new Response('origin', {
            status: 201,
            headers: {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*',
            },
          })) satisfies () => Promise<Response>,
        {
          FP_RULESET_ID: '',
        } satisfies Partial<TypedEnv>,
        201,
        new Request(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            origin: mockWorkerBaseUrl,
          },
        }),
      ],
    ])(
      'should add CORS responses headers when ingress fails - %s',
      async (_name, mockOriginHandler, envUpdates, expectedStatusCode, expectedOriginRequest) => {
        const { getOriginRequest } = prepareMockFetch({
          mockIngressHandler: async () => {
            throw new Error('Ingress failed')
          },
          mockOriginHandler,
        })

        // Include a cookie in the request but don't add the flag to the signals
        // to test that cookies are still removed from the request before it is
        // forwarded to the origin
        const request = new CloudflareRequest(apiUrl, {
          method: 'POST',
          headers: new Headers({
            'Content-Type': 'text/plain',
            origin: mockWorkerBaseUrl,
            Cookie: 'name=value',
            [SIGNALS_KEY]: 'test-signals-data',
          }),
          body: 'content',
        })

        const testCaseEnv: TypedEnv = {
          ...crossOriginApiEnv,
          ...envUpdates,
        }

        const ctx = createExecutionContext()
        const response = await handler.fetch(request, testCaseEnv, ctx)
        await waitOnExecutionContext(ctx)

        expect(response.status).toEqual(expectedStatusCode)
        expect(response.headers.get('Access-Control-Allow-Origin')).toEqual(mockWorkerBaseUrl)
        expect(response.headers.get('Access-Control-Allow-Credentials')).toEqual('true')
        expect(response.headers.get('Access-Control-Expose-Headers')).toBeNull()

        expect(getOriginRequest()).toEqual(expectedOriginRequest)
      }
    )
  })
})
