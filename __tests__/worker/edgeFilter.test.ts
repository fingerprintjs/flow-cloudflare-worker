import { describe, expect, it } from 'vitest'
import { shouldSkipEdgeRequest } from '../../src/worker/utils/edgeFilter'
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
  it.each(['script', 'image', 'font', 'speculationrules'])('skips for static destination %s', (destination) => {
    expect(shouldSkipEdgeRequest(createRequest('GET', destination), wildcardEnv)).toBe(true)
  })

  it.each(['GET', 'HEAD'])('skips on %s', (method) => {
    expect(shouldSkipEdgeRequest(createRequest(method, 'script'), wildcardEnv)).toBe(true)
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('does not skip on %s', (method) => {
    expect(shouldSkipEdgeRequest(createRequest(method, 'script'), wildcardEnv)).toBe(false)
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
    // Skips: only a wildcard pattern matches
    ['path wildcard', ['/*'], '/assets/app.js', true],
    ['wildcard next to exact path', ['/*', '/login'], '/assets/app.js', true],
    ['path with query string under wildcard', ['/*'], '/assets/app.js?v=2', true],

    // Calls edge: an exact pattern matches
    ['exact path', ['/assets/app.js'], '/assets/app.js', false],
    ['exact path over wildcard', ['/*', '/login'], '/login', false],
    ['exact path with query string over wildcard', ['/*', '/login'], '/login?next=/account', false],
    ['wildcard in fragment', ['/page#*'], '/page', false],

    // Calls edge: the root page, even when only a wildcard matches
    ['root page under wildcard', ['/*'], '/', false],
    ['root page with query string under wildcard', ['/*'], '/?utm_source=ad', false],
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

  describe('FP_EDGE_INCLUDE_STATIC_ASSETS', () => {
    function envWithIncludeStaticAssets(value: string | undefined): TypedEnv {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return { ...wildcardEnv, FP_EDGE_INCLUDE_STATIC_ASSETS: value } as TypedEnv
    }

    it.each([undefined, '', 'false', 'yes'])('skips when set to %j', (value) => {
      expect(shouldSkipEdgeRequest(createRequest('GET', 'script'), envWithIncludeStaticAssets(value))).toBe(true)
    })

    it('does not skip when set to "true"', () => {
      expect(shouldSkipEdgeRequest(createRequest('GET', 'script'), envWithIncludeStaticAssets('true'))).toBe(false)
    })
  })
})
