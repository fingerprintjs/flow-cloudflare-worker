import { describe, expect, it } from 'vitest'
import { shouldSkipEdgeRequest, STATIC_ASSET_DESTINATIONS } from '../../src/worker/utils/edgeFilter'
import { mockEnv, mockUrl } from '../utils/mockEnv'
import { TypedEnv } from '../../src/worker/types'

const wildcardEnv: TypedEnv = { ...mockEnv, IDENTIFICATION_PAGE_URLS: [mockUrl('/*')] }

function createRequest(method: string, destination?: string, path = '/assets/app.js') {
  const headers = new Headers()
  if (destination !== undefined) {
    headers.set('Sec-Fetch-Dest', destination)
  }

  return new Request(mockUrl(path), { method, headers })
}

describe('shouldSkipEdgeRequest', () => {
  describe.each([...STATIC_ASSET_DESTINATIONS])('static destination %s', (destination) => {
    it.each(['GET', 'HEAD'])('skips on %s', (method) => {
      expect(shouldSkipEdgeRequest(createRequest(method, destination), wildcardEnv)).toBe(true)
    })

    it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('does not skip on %s', (method) => {
      expect(shouldSkipEdgeRequest(createRequest(method, destination), wildcardEnv)).toBe(false)
    })
  })

  it.each([
    ['document', 'document'],
    ['iframe', 'iframe'],
    ['frame', 'frame'],
    ['embed', 'embed'],
    ['object', 'object'],
    ['empty', 'empty'],
    ['empty string', ''],
    ['unknown value', 'bogus'],
    ['different case', 'Script'],
    ['list of values', 'script, image'],
  ])('does not skip for %s', (_, destination) => {
    expect(shouldSkipEdgeRequest(createRequest('GET', destination), wildcardEnv)).toBe(false)
  })

  it('does not skip when Sec-Fetch-Dest is missing', () => {
    expect(shouldSkipEdgeRequest(createRequest('GET'), wildcardEnv)).toBe(false)
  })

  it.each([
    ['path wildcard', ['/*'], '/assets/app.js', true],
    ['exact path', ['/assets/app.js'], '/assets/app.js', false],
    ['exact path over wildcard', ['/*', '/login'], '/login', false],
    ['exact path with query string over wildcard', ['/*', '/login'], '/login?next=/account', false],
    ['wildcard next to exact path', ['/*', '/login'], '/assets/app.js', true],
    ['wildcard in fragment', ['/page#*'], '/page', false],
    ['root page with query string under wildcard', ['/*'], '/?utm_source=ad', true],
    ['exact root with query string over wildcard', ['/*', '/'], '/?utm_source=ad', false],
    ['path with query string under wildcard', ['/*'], '/assets/app.js?v=2', true],
  ])('identification page pattern: %s', (_, patterns, path, expected) => {
    const env: TypedEnv = { ...mockEnv, IDENTIFICATION_PAGE_URLS: patterns.map(mockUrl) }

    expect(shouldSkipEdgeRequest(createRequest('GET', 'script', path), env)).toBe(expected)
  })

  it.each([
    ['longer wildcard', ['https://example.com/login*', 'https://example.com/login']],
    ['more specific wildcard host', ['https://example.com/*', 'https://*.com/login']],
  ])('exact path wins over %s', (_, patterns) => {
    const env: TypedEnv = { ...mockEnv, IDENTIFICATION_PAGE_URLS: patterns }

    expect(shouldSkipEdgeRequest(createRequest('GET', 'script', '/login'), env)).toBe(false)
  })

  it('does not skip for bare host wildcard', () => {
    const env: TypedEnv = { ...mockEnv, IDENTIFICATION_PAGE_URLS: ['https://*'] }

    expect(shouldSkipEdgeRequest(createRequest('GET', 'script', '/'), env)).toBe(false)
  })

  it.each([
    ['unset', undefined, true],
    ['empty', '', true],
    ['false', 'false', true],
    ['invalid', 'yes', true],
    ['true', 'true', false],
  ])('FP_EDGE_INCLUDE_STATIC_ASSETS %s', (_, value, expected) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const env = { ...wildcardEnv, FP_EDGE_INCLUDE_STATIC_ASSETS: value } as TypedEnv

    expect(shouldSkipEdgeRequest(createRequest('GET', 'script'), env)).toBe(expected)
  })
})
