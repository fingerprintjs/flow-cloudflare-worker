import { describe, it, expect } from 'vitest'
import { handleTampering, TamperingError } from '../../src/worker/fingerprint/tampering'

function buildRequest(origin: string, ip: string) {
  return new Request('https://worker.local/identify', {
    method: 'POST',
    headers: {
      // Origin of the page that initiated the request
      origin,
      // getIp() reads cf-connecting-ip in non-dev environments
      'cf-connecting-ip': ip,
    },
    body: '{}',
  })
}

function buildEvent(
  params: Partial<{
    timestamp: Date
    url: string
    ip_address: string
  }> = {}
) {
  return {
    replayed: false,
    timestamp: params.timestamp ?? new Date(),
    url: params.url ?? 'https://example.com/some/path',
    ip_address: params.ip_address ?? '203.0.113.10',
  }
}

describe('tampering verifier', () => {
  it('passes for fresh request with matching origin and IP', async () => {
    const origin = 'https://example.com'
    const ip = '203.0.113.10'
    const request = buildRequest(origin, ip)
    const event = buildEvent({ url: `${origin}/foo`, ip_address: ip })

    await expect(handleTampering(event, request)).resolves.toBeUndefined()
  })

  it('throws TamperingError for old timestamp (potential replay)', async () => {
    const origin = 'https://example.com'
    const ip = '203.0.113.11'
    const request = buildRequest(origin, ip)
    const old = new Date(Date.now() - 5000)
    const event = buildEvent({ timestamp: old, url: `${origin}/bar`, ip_address: ip })

    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })

  it('throws TamperingError for origin mismatch', async () => {
    const request = buildRequest('https://evil.example', '203.0.113.12')
    const event = buildEvent({ url: 'https://example.com/ok', ip_address: '203.0.113.12' })

    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })

  it('throws TamperingError for IP mismatch', async () => {
    const origin = 'https://example.com'
    const request = buildRequest(origin, '203.0.113.100')
    const event = buildEvent({ url: `${origin}/ok`, ip_address: '203.0.113.200' })

    await expect(handleTampering(event, request)).rejects.toBeInstanceOf(TamperingError)
  })
})
