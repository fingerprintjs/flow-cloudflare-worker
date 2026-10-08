import { describe, expect, it } from 'vitest'
import { shouldSkipEdgeRequest as shouldSkipEdgeRequestForRoute } from '../../src/worker/utils/edgeFilter'
import { matchRoute } from '../../src/worker/urlMatching'
import { mockEnv, mockUrl } from '../utils/mockEnv'
import { TypedEnv } from '../../src/worker/types'

// Matches the route like the handler does before calling the filter
function shouldSkipEdgeRequest(request: Request, env: TypedEnv) {
  const route = matchRoute(new URL(request.url), request.method, env)
  expect(route?.metadata?.type).toBe('identification')

  return shouldSkipEdgeRequestForRoute(request, env, route!)
}

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
    // Skips: matched wildcard and pathname is not the pattern's path
    ['path wildcard', ['/*'], '/assets/app.js', true],
    ['wildcard next to exact path', ['/*', '/login'], '/assets/app.js', true],
    ['path with query string under wildcard', ['/*'], '/assets/app.js?v=2', true],
    ['path under nested wildcard', ['/base/*'], '/base/app.js', true],
    ['exact path with query string next to wildcard', ['/*', '/login'], '/login?next=/account', true],
    ['trailing wildcard does not cover suffix', ['/*', '/login*'], '/login-old', true],
    ['trailing wildcard does not cover nested path', ['/*', '/login*'], '/login/extra', true],

    // Calls edge: matched route path equals pathname
    ['exact path', ['/assets/app.js'], '/assets/app.js', false],
    ['exact path over wildcard', ['/*', '/login'], '/login', false],
    ['trailing wildcard covering query string', ['/*', '/login*'], '/login?next=/account', false],
    ['trailing wildcard covering exact path', ['/*', '/login*'], '/login', false],
    ['wildcard in fragment', ['/page#*'], '/page', false],

    // Calls edge: the matched wildcard pattern's base path, e.g. the root page
    ['root page under wildcard', ['/*'], '/', false],
    ['root page with query string under wildcard', ['/*'], '/?utm_source=ad', false],
    ['base path under nested wildcard', ['/base/*'], '/base/', false],
    ['base path with query string under nested wildcard', ['/base/*'], '/base/?utm_source=ad', false],
    ['base path under wildcard without slash', ['/base*'], '/base', false],
  ])('identification page pattern: %s', (_, patterns, path, expected) => {
    const env: TypedEnv = { ...mockEnv, IDENTIFICATION_PAGE_URLS: patterns.map(mockUrl) }

    expect(shouldSkipEdgeRequest(createRequest('GET', 'script', path), env)).toBe(expected)
  })

  it.each([
    ['longer wildcard', ['https://example.com/login*', 'https://example.com/login'], false],
    ['more specific wildcard host', ['https://example.com/*', 'https://*.com/login'], true],
  ])('matched route vs %s', (_, patterns, expected) => {
    const env: TypedEnv = { ...mockEnv, IDENTIFICATION_PAGE_URLS: patterns }

    expect(shouldSkipEdgeRequest(createRequest('GET', 'script', '/login'), env)).toBe(expected)
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
