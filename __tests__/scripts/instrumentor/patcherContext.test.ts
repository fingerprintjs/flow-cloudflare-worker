import { WritablePatcherContext } from '../../../src/scripts/instrumentor/patcher/context'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findMatchingRoute } from '@fingerprintjs/url-matcher'

vi.mock('@fingerprintjs/url-matcher', {
  spy: true,
})

describe('Patcher context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Is protected url', () => {
    it('should return true for route with multiple HTTP methods', () => {
      const ctx = new WritablePatcherContext([
        { method: 'POST', url: 'example.com/api/*' },
        { method: 'PUT', url: 'example.com/api/*' },
      ])

      expect(ctx.isProtectedUrl('https://example.com/api/login', 'POST')).toBe(true)
      expect(ctx.isProtectedUrl('https://example.com/api/login', 'PUT')).toBe(true)
      expect(vi.mocked(findMatchingRoute)).toHaveBeenCalledTimes(2)
    })

    it('should return false for invalid HTTP method without calling findMatchingRoute', () => {
      // @ts-expect-error Invalid method
      const ctx = new WritablePatcherContext([{ method: 'INVALID', url: 'example.com/api/*' }])

      expect(ctx.isProtectedUrl('https://example.com/api/login', 'INVALID')).toBe(false)
      expect(vi.mocked(findMatchingRoute)).toHaveBeenCalledTimes(0)
    })

    it('should return false for different HTTP method without calling findMatchingRoute', () => {
      const ctx = new WritablePatcherContext([{ method: 'POST', url: 'example.com/api/*' }])

      expect(ctx.isProtectedUrl('https://example.com/api/login', 'PUT')).toBe(false)
      expect(vi.mocked(findMatchingRoute)).toHaveBeenCalledTimes(0)
    })
  })
})
