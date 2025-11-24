import { WritablePatcherContext } from '../../../src/scripts/instrumentor/patcher/context'
import { expect, describe, it } from 'vitest'

describe('Patcher context', () => {
  describe('Is protected url', () => {
    it('should return true for route with multiple HTTP methods', () => {
      const ctx = new WritablePatcherContext([
        { method: 'POST', url: 'example.com/api/*' },
        { method: 'PUT', url: 'example.com/api/*' },
      ])

      expect(ctx.isProtectedUrl('https://example.com/api/login', 'POST')).toBe(true)
      expect(ctx.isProtectedUrl('https://example.com/api/login', 'PUT')).toBe(true)
    })
  })
})
