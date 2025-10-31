import { describe, it, expect } from 'vitest'
import { createResponseWithMaxAge } from '../../src/worker/utils/cache'

describe('Cache', () => {
  describe('Response with max age', () => {
    it('should handle non-numeric values in max-age', () => {
      const response = new Response('test', {
        headers: {
          'cache-control': 'max-age=none',
        },
      })

      const result = createResponseWithMaxAge(response, {
        maxAge: 60,
        sMaxAge: 60,
      })

      expect(result.headers.get('cache-control')).toEqual('max-age=none, s-maxage=60')
    })

    it('should handle non-numeric values in smax-age', () => {
      const response = new Response('test', {
        headers: {
          'cache-control': 'max-age=60, s-maxage=none',
        },
      })

      const result = createResponseWithMaxAge(response, {
        maxAge: 60,
        sMaxAge: 60,
      })

      expect(result.headers.get('cache-control')).toEqual('max-age=60, s-maxage=none')
    })
  })
})
