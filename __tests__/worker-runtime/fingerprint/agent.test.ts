import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAgentLoader } from '../../../src/worker/fingerprint/agent'

describe('getAgentLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('agent-script'))
  })

  it('should not forward query params from the incoming request to the CDN', async () => {
    const request = new Request('https://example.com/scripts/loader.js?q=123&version=3')

    await getAgentLoader(request, 'FP_PUBLIC_KEY', 'fpcdn.io')

    expect(fetch).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const fetchRequest = vi.mocked(fetch).mock.calls[0][0] as Request
    expect(fetchRequest.url).toEqual(
      'https://fpcdn.io/v4/FP_PUBLIC_KEY?ii=fingerprint-flow-cloudflare%2F0.0.1-test%2Fprocdn'
    )
  })
})
