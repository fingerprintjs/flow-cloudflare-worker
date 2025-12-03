import { describe, it, expect } from 'vitest'
import { handleTampering, TamperingError } from '../../src/worker/fingerprint/tampering'

interface BuildRequestParams {
  ip: string
  origin?: string
  method?: string
}

function buildRequest({ ip, origin, method = 'POST' }: BuildRequestParams) {
  const hasBody = !['GET', 'HEAD'].includes(method)

  return new Request('https://worker.local/identify', {
    method,
    headers: {
      // Origin of the page that initiated the request
      ...(origin ? { origin } : {}),
      // getIp() reads cf-connecting-ip in non-dev environments
      'cf-connecting-ip': ip,
    },
    ...(hasBody ? { body: JSON.stringify({}) } : {}),
  })
}

function buildEvent(
  params: Partial<{
    timestamp: Date
    url: string
    ip_address: string
    replayed: boolean
  }> = {}
) {
  return {
    replayed: params.replayed ?? false,
    timestamp: params.timestamp ?? new Date(),
    url: params.url ?? 'https://example.com/some/path',
    ip_address: params.ip_address ?? '203.0.113.10',
  }
}

describe('tampering verifier', () => {
  it('passes for fresh request with matching origin and IP', async () => {
    const origin = 'https://example.com'
    const ip = '203.0.113.10'
    const request = buildRequest({ ip: ip, origin: origin })
    const event = buildEvent({ url: `${origin}/foo`, ip_address: ip })

    await expect(handleTampering(event, request)).resolves.toBeUndefined()
  })

  it.each(['GET', 'HEAD'])('passes for %s request without origin', async (method) => {
    const origin = 'https://example.com'
    const ip = '203.0.113.10'
    const request = buildRequest({ ip, method })
    const event = buildEvent({ url: `${origin}/foo`, ip_address: ip })

    await expect(handleTampering(event, request)).resolves.toBeUndefined()
  })

  it('throws TamperingError for POST request without origin', async () => {
    const origin = 'https://example.com'
    const ip = '203.0.113.10'
    const request = buildRequest({ ip, method: 'POST' })
    const event = buildEvent({ url: `${origin}/foo`, ip_address: ip })

    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })

  it('throws TamperingError for old timestamp (potential replay)', async () => {
    const origin = 'https://example.com'
    const ip = '203.0.113.11'
    const request = buildRequest({ ip: ip, origin: origin })
    const old = new Date(Date.now() - 5000)
    const event = buildEvent({ timestamp: old, url: `${origin}/bar`, ip_address: ip })

    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })

  it('throws TamperingError for origin mismatch', async () => {
    const request = buildRequest({ ip: '203.0.113.12', origin: 'https://evil.example' })
    const event = buildEvent({ url: 'https://example.com/ok', ip_address: '203.0.113.12' })

    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })

  it('throws TamperingError for IP mismatch', async () => {
    const origin = 'https://example.com'
    const request = buildRequest({ ip: '203.0.113.100', origin: origin })
    const event = buildEvent({ url: `${origin}/ok`, ip_address: '203.0.113.200' })

    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })

  it('throws TamperingError for IP v6 mismatch', async () => {
    const origin = 'https://example.com'
    const request = buildRequest({ ip: '2001:db8::100', origin: origin })
    const event = buildEvent({ url: `${origin}/ok`, ip_address: '2001:db8::200' })
    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })

  it('throws TamperingError when event is replayed', async () => {
    const origin = 'https://example.com'
    const ip = '203.0.113.10'
    const request = buildRequest({ ip: ip, origin: origin })
    const event = buildEvent({ url: `${origin}/foo`, ip_address: ip, replayed: true })

    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })
})
