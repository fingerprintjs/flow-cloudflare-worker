import { describe, expect, it } from 'vitest'
import { mockEnv } from '../utils/mockEnv'
import { TypedEnv } from '../../src/worker/types'
import { matchUrl } from '../../src/worker/urlMatching'

describe('URL matching', () => {
  describe('Protected API matching', () => {
    it('should match protected url with trailing wildcard', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://api.example.com/api/*',
          },
        ],
      }

      const result = matchUrl(new URL('https://api.example.com/api/v1/users'), 'POST', env)

      expect(result).toEqual({
        type: 'protection',
        method: 'POST',
      })
    })

    it('should match protected url with exact path', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://api.example.com/api/users',
          },
        ],
      }

      const result = matchUrl(new URL('https://api.example.com/api/users'), 'POST', env)

      expect(result).toEqual({
        type: 'protection',
        method: 'POST',
      })
    })

    it('should match protected url with wildcard at end', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://api.example.com/api/v1/users/*',
          },
        ],
      }

      const result = matchUrl(new URL('https://api.example.com/api/v1/users/123'), 'POST', env)

      expect(result).toEqual({
        type: 'protection',
        method: 'POST',
      })
    })

    it('should not match protected url with wrong HTTP method', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://api.example.com/api/*',
          },
        ],
      }

      const result = matchUrl(new URL('https://api.example.com/api/users'), 'GET', env)

      expect(result).toBeUndefined()
    })

    it('should not match protected url that does not match pattern', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://api.example.com/api/users',
          },
        ],
      }

      const result = matchUrl(new URL('https://api.example.com/api/posts'), 'POST', env)

      expect(result).toBeUndefined()
    })

    it('should match multiple protected APIs', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://api.example.com/api/v1/*',
          },
          {
            method: 'POST',
            url: 'https://api.example.com/api/v2/*',
          },
        ],
      }

      expect(matchUrl(new URL('https://api.example.com/api/v1/users'), 'POST', env)).toEqual({
        type: 'protection',
        method: 'POST',
      })
      expect(matchUrl(new URL('https://api.example.com/api/v2/users'), 'POST', env)).toEqual({
        type: 'protection',
        method: 'POST',
      })
      expect(matchUrl(new URL('https://api.example.com/api/v3/users'), 'POST', env)).toBeUndefined()
    })
  })

  describe('Identification page matching', () => {
    it('should match identification page url', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: ['https://example.com/identify'],
      }

      const result = matchUrl(new URL('https://example.com/identify'), 'GET', env)

      expect(result).toEqual({
        type: 'identification',
      })
    })

    it('should match identification page url with specific path', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: ['https://example.com/blog/*'],
      }

      const result = matchUrl(new URL('https://example.com/blog/123'), 'GET', env)

      expect(result).toEqual({
        type: 'identification',
      })
    })

    it('should match identification page url with nested path', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: ['https://example.com/auth/identify'],
      }

      const result = matchUrl(new URL('https://example.com/auth/identify'), 'GET', env)

      expect(result).toEqual({
        type: 'identification',
      })
    })

    it('should match multiple identification page urls', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: [
          'https://example.com/identify',
          'https://example.com/auth/identify',
          'https://example.com/login',
        ],
      }

      const result1 = matchUrl(new URL('https://example.com/identify'), 'GET', env)
      const result2 = matchUrl(new URL('https://example.com/auth/identify'), 'POST', env)
      const result3 = matchUrl(new URL('https://example.com/login'), 'GET', env)

      expect(result1).toEqual({
        type: 'identification',
      })
      expect(result2).toEqual({
        type: 'identification',
      })
      expect(result3).toEqual({
        type: 'identification',
      })
    })

    it('should not match identification page that does not exist', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: ['https://example.com/identify'],
      }

      const result = matchUrl(new URL('https://example.com/login'), 'GET', env)

      expect(result).toBeUndefined()
    })
  })

  describe('Script behavior path matching', () => {
    it('should match script behavior path', () => {
      const env: TypedEnv = {
        ...mockEnv,
        WORKER_ROUTE_PREFIX: 'scripts',
      }

      const result = matchUrl(new URL('https://example.com/scripts/instrumentor.iife.js'), 'GET', env)

      expect(result).toEqual({
        type: 'script',
        script: 'instrumentor.iife.js',
      })
    })

    it('should match script behavior path with different script', () => {
      const env: TypedEnv = {
        ...mockEnv,
        WORKER_ROUTE_PREFIX: 'js',
      }

      const result = matchUrl(new URL('https://example.com/js/loader.js'), 'GET', env)

      expect(result).toEqual({
        type: 'script',
        script: 'loader.js',
      })
    })

    it('should match script behavior path with different base path', () => {
      const env: TypedEnv = {
        ...mockEnv,
        WORKER_ROUTE_PREFIX: 'assets/scripts',
      }

      const result = matchUrl(new URL('https://example.com/assets/scripts/instrumentor.iife.js'), 'GET', env)

      expect(result).toEqual({
        type: 'script',
        script: 'instrumentor.iife.js',
      })
    })

    it('should not match url that does not contain script behavior path', () => {
      const env: TypedEnv = {
        ...mockEnv,
        WORKER_ROUTE_PREFIX: 'scripts',
      }

      const result = matchUrl(new URL('https://example.com/assets/main.js'), 'GET', env)

      expect(result).toBeUndefined()
    })
  })

  describe('Priority and edge cases', () => {
    it('should prioritize script behavior path over other matches', () => {
      const env: TypedEnv = {
        ...mockEnv,
        WORKER_ROUTE_PREFIX: 'scripts',
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://example.com/scripts/*',
          },
        ],
        IDENTIFICATION_PAGE_URLS: ['https://example.com/scripts/identify'],
      }

      const result = matchUrl(new URL('https://example.com/scripts/loader.js'), 'GET', env)

      expect(result).toEqual({
        type: 'script',
        script: 'loader.js',
      })
    })

    it('should return undefined for unmatched URLs', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://example.com/api/*',
          },
        ],
        IDENTIFICATION_PAGE_URLS: ['https://example.com/identify'],
        WORKER_ROUTE_PREFIX: 'scripts',
      }

      const result = matchUrl(new URL('https://example.com/some/random/path'), 'GET', env)

      expect(result).toBeUndefined()
    })

    it('should handle empty configuration', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [],
        IDENTIFICATION_PAGE_URLS: [],
        WORKER_ROUTE_PREFIX: 'scripts',
      }

      const result = matchUrl(new URL('https://example.com/api/users'), 'POST', env)

      expect(result).toBeUndefined()
    })

    it('should handle URLs with query parameters using wildcard', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://api.example.com/api/*',
          },
        ],
      }

      const result = matchUrl(new URL('https://api.example.com/api/users?id=123&name=test'), 'POST', env)

      expect(result).toEqual({
        type: 'protection',
        method: 'POST',
      })
    })

    it('should handle URLs with hash fragments', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: ['https://example.com/identify'],
      }

      const result = matchUrl(new URL('https://example.com/identify#section1'), 'GET', env)

      expect(result).toEqual({
        type: 'identification',
      })
    })

    it('should not match protected API with different domains', () => {
      const env: TypedEnv = {
        ...mockEnv,
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://example.com/api/*',
          },
        ],
      }

      const result1 = matchUrl(new URL('https://example.com/api/users'), 'POST', env)
      const result2 = matchUrl(new URL('https://different-domain.com/api/users'), 'POST', env)

      expect(result1).toEqual({
        type: 'protection',
        method: 'POST',
      })
      expect(result2).toBeUndefined()
    })

    it('should handle root path matching', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: ['https://example.com/'],
      }

      const result = matchUrl(new URL('https://example.com/'), 'GET', env)

      expect(result).toEqual({
        type: 'identification',
      })

      expect(matchUrl(new URL('https://example.com/blog'), 'GET', env)).toBeUndefined()
    })

    it('should handle specificity', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: ['https://example.com/blog/post/*', 'https://example.com/blog/about'],
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://example.com/blog/like/*',
          },
        ],
      }

      expect(matchUrl(new URL('https://example.com/blog/post/123'), 'GET', env)).toEqual({
        type: 'identification',
      })
      expect(matchUrl(new URL('https://example.com/blog/about'), 'GET', env)).toEqual({
        type: 'identification',
      })
      expect(matchUrl(new URL('https://example.com/blog/like/post/123'), 'POST', env)).toEqual({
        type: 'protection',
        method: 'POST',
      })
      expect(matchUrl(new URL('https://example.com/privacy'), 'GET', env)).toBeUndefined()
    })

    it('should handle same route with different methods', () => {
      const env: TypedEnv = {
        ...mockEnv,
        IDENTIFICATION_PAGE_URLS: ['https://example.com/blog/*'],
        PROTECTED_APIS: [
          {
            method: 'POST',
            url: 'https://example.com/blog/*',
          },
        ],
      }

      expect(matchUrl(new URL('https://example.com/blog/post/123'), 'GET', env)).toEqual({
        type: 'identification',
      })
      expect(matchUrl(new URL('https://example.com/blog/post/123'), 'POST', env)).toEqual({
        type: 'protection',
        method: 'POST',
      })
      expect(matchUrl(new URL('https://example.com/privacy'), 'GET', env)).toBeUndefined()
    })
  })
})
