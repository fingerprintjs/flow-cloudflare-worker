import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import handler from '../../../src/worker'
import { CloudflareRequest } from '../request'
import { IdentificationClient } from '../../../src/worker/fingerprint/identificationClient'
import { mockEnv, mockUrl } from '../../utils/mockEnv'
import { getRoutePrefix } from '../../../src/worker/env'
import * as Origin from '../../../src/worker/utils/origin'

describe('Browser cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(globalThis, 'fetch')
    vi.spyOn(IdentificationClient.prototype, 'browserCache')
    vi.spyOn(Origin, 'fetchOrigin')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should correctly proxy browser cache requests', async () => {
    const mockResponseBody =
      'vxN6GXX6HjTIMZ74U7iI9G7TQf7gNwk0Gawn5/yJhTcDN5P1jR3v22L4Fem119TJzI5wZtHfZpdJgJpNv7nBB4J1v2E87w=='

    vi.mocked(fetch).mockResolvedValue(
      new Response(mockResponseBody, {
        headers: {
          // Test that custom headers are returned as-is
          'x-custom-header': 'true',
        },
      })
    )

    const request = new CloudflareRequest(mockUrl(`/${getRoutePrefix(mockEnv)}/wWveUv5/uoE?q=uxA8kJe9InOmy1MQz12y`))
    // cookie should be omitted in the browser cache request
    request.headers.set('cookie', '_iidt=12345')

    const ctx = createExecutionContext()
    const response = await handler.fetch(request, mockEnv)
    await waitOnExecutionContext(ctx)

    const browserCacheRequest = vi.mocked(fetch).mock.calls[0][0] as Request
    expect(browserCacheRequest.headers.get('cookie')).toBeNull()
    // URL shouldn't contain route prefix
    expect(browserCacheRequest.url).toEqual('https://api.fpjs.io/wWveUv5/uoE?q=uxA8kJe9InOmy1MQz12y')

    expect(await response.text()).toEqual(mockResponseBody)
    // Test that custom headers are returned as-is
    expect(response.headers.get('x-custom-header')).toEqual('true')

    expect(IdentificationClient.prototype.browserCache).toHaveBeenCalledTimes(1)
    expect(Origin.fetchOrigin).toHaveBeenCalledTimes(0)
  })

  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])('should fallback to origin for %s method', async (method) => {
    vi.mocked(fetch).mockResolvedValue(new Response('origin'))

    const request = new CloudflareRequest(mockUrl(`/${getRoutePrefix(mockEnv)}/wWveUv5/uoE?q=uxA8kJe9InOmy1MQz12y`), {
      method,
    })
    request.headers.set('cookie', '_iidt=12345')

    const ctx = createExecutionContext()
    const response = await handler.fetch(request, mockEnv)
    await waitOnExecutionContext(ctx)

    expect(await response.text()).toEqual('origin')

    expect(IdentificationClient.prototype.browserCache).toHaveBeenCalledTimes(0)
    expect(Origin.fetchOrigin).toHaveBeenCalledTimes(1)
  })
})
