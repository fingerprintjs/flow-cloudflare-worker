import { describe, expect, it } from 'vitest'

import { getCrossOriginUrl, setCorsHeadersForInstrumentation } from '../../src/worker/utils/request'
import { AGENT_DATA_HEADER, SIGNALS_KEY } from '../../src/shared/const'
import { EdgeHeaders } from '../../src/worker/utils/headers'

describe('Request', () => {
  describe('getCrossOriginUrl', () => {
    it.each([
      ['same-origin request', 'GET', 'https://example.com/path', undefined, null],
      [
        'cross-origin request',
        'GET',
        'https://api.example.com/data',
        'https://app.example.com',
        'https://app.example.com',
      ],
      ['same-origin with Origin header', 'POST', 'https://example.com/path', 'https://example.com', null],
      ['null Origin header', 'GET', 'https://example.com/path', 'null', null],
      ['invalid Origin header value', 'GET', 'https://api.example.com/data', 'not-a-valid-origin', null],
      ['invalid Origin with path', 'GET', 'https://api.example.com/data', 'https://app.example.com/foo', null],
      ['invalid Origin with query', 'GET', 'https://api.example.com/data', 'https://app.example.com?q=1', null],
      ['invalid Origin with fragment', 'GET', 'https://api.example.com/data', 'https://app.example.com#fragment', null],
      ['invalid Origin with trailing slash', 'GET', 'https://api.example.com', 'https://app.example.com/', null],
    ])('%s', (_name, method, url, origin, expectedOrigin) => {
      const request = new Request(url, {
        headers: origin
          ? {
              Origin: origin,
            }
          : {},
        method,
      })
      const crossOriginUrl = getCrossOriginUrl(request)
      if (crossOriginUrl) {
        expect(crossOriginUrl.origin).toStrictEqual(expectedOrigin)
      } else {
        expect(crossOriginUrl).toStrictEqual(expectedOrigin)
      }
    })
  })

  describe('setCorsHeadersForInstrumentation', () => {
    it('should not modify headers when Access-Control-Allow-Origin is not set', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers()

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBeNull()
      expect(headers.get('Access-Control-Allow-Credentials')).toBeNull()
      expect(headers.get('Access-Control-Expose-Headers')).toBeNull()
    })

    it('should not modify headers when Access-Control-Allow-Origin is "null"', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': 'null',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('null')
      expect(headers.get('Access-Control-Allow-Credentials')).toBeNull()
      expect(headers.get('Access-Control-Expose-Headers')).toBeNull()
    })

    it('should set credentials and expose headers when Access-Control-Allow-Origin is a specific origin', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': 'https://allowed.example.com',
        [AGENT_DATA_HEADER]: 'agent-data',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example.com')
      expect(headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(headers.get('Access-Control-Expose-Headers')).toBe(AGENT_DATA_HEADER)
    })

    it('should reflect Origin header when Access-Control-Allow-Origin is wildcard', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://origin.example.com')
      expect(headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(headers.get('Access-Control-Expose-Headers')).toBeNull()
    })

    it('should not modify headers when Access-Control-Allow-Origin is wildcard but Origin header is missing', () => {
      const request = new Request('https://example.com')
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(headers.get('Access-Control-Allow-Credentials')).toBeNull()
      expect(headers.get('Access-Control-Expose-Headers')).toBeNull()
    })

    it('should not modify headers when Access-Control-Allow-Origin is wildcard and Origin header is invalid', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'invalid-url' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(headers.get('Access-Control-Allow-Credentials')).toBeNull()
      expect(headers.get('Access-Control-Expose-Headers')).toBeNull()
    })

    it('should handle case where Access-Control-Allow-Credentials is already set', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': 'https://allowed.example.com',
        'Access-Control-Allow-Credentials': 'true',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example.com')
      expect(headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(headers.get('Access-Control-Expose-Headers')).toBeNull()
    })

    it('should append to existing Access-Control-Expose-Headers', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': 'https://allowed.example.com',
        'Access-Control-Expose-Headers': 'X-Custom-Header',
        [AGENT_DATA_HEADER]: 'agent-data',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Expose-Headers')).toBe(`X-Custom-Header,${AGENT_DATA_HEADER}`)
    })

    it('should append to existing Access-Control-Expose-Headers with multiple values', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': 'https://allowed.example.com',
        'Access-Control-Expose-Headers': 'X-Custom-Header, X-Another-Header',
        [AGENT_DATA_HEADER]: 'agent-data',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Expose-Headers')).toBe(`X-Custom-Header,X-Another-Header,${AGENT_DATA_HEADER}`)
    })

    it('should add to Access-Control-Expose-Headers headers from Edge API', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': 'https://allowed.example.com',
        'Access-Control-Expose-Headers': 'X-Custom-Header, X-Another-Header',
        [AGENT_DATA_HEADER]: 'agent-data',
        [EdgeHeaders.BotInfoName]: 'bot',
        [EdgeHeaders.BotInfoProvider]: 'provider',
        [EdgeHeaders.BotInfoCategory]: 'category',
        [EdgeHeaders.BotInfoIdentity]: 'good',
        [EdgeHeaders.IpV6Address]: 'fc00:db20:35b:7399::5',
        [EdgeHeaders.IpV4Address]: '192.168.1.1',
      })

      setCorsHeadersForInstrumentation(request, headers)

      const exposedHeaders = headers
        .get('Access-Control-Expose-Headers')
        ?.split(',')
        .map((it) => it.trim())

      // Expected length: All edge headers + custom headers (2) + agent data header
      expect(exposedHeaders).toHaveLength(Object.values(EdgeHeaders).length + 3)
      expect(exposedHeaders).toContain('X-Custom-Header')
      expect(exposedHeaders).toContain('X-Another-Header')
      expect(exposedHeaders).toContain(AGENT_DATA_HEADER)

      for (const edgeHeader of Object.values(EdgeHeaders)) {
        expect(exposedHeaders).toContain(edgeHeader)
      }
    })

    it('should handle Origin with port correctly', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com:8080' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://origin.example.com:8080')
      expect(headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should handle Origin with path by not setting other CORS headers', () => {
      const request = new Request('https://example.com', {
        headers: { Origin: 'https://origin.example.com:8080/some/path' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(headers.get('Access-Control-Allow-Credentials')).toBeNull()
      expect(headers.get('Access-Control-Expose-Headers')).toBeNull()
    })

    it('should handle OPTIONS method', () => {
      const request = new Request('https://example.com', {
        method: 'OPTIONS',
        headers: { Origin: 'https://origin.example.com' },
      })
      const headers = new Headers({
        'Access-Control-Allow-Origin': 'https://allowed.example.com',
        'Access-Control-Allow-Headers': 'content-type',
      })

      setCorsHeadersForInstrumentation(request, headers)

      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example.com')
      expect(headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(headers.get('Access-Control-Expose-Headers')).toBeNull()
      expect(headers.get('Access-Control-Allow-Headers')).toEqual(`content-type,${SIGNALS_KEY}`)
    })
  })
})
