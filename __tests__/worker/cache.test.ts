import { describe, it, expect } from 'vitest'
import { createResponseWithMaxAge } from '../../src/worker/utils/cache'

describe('Cache', () => {
  const directives = ['max-age', 's-maxage'] as const

  describe('Response with max age', () => {
    directives.forEach((directive) => {
      const otherDirective = directive === 'max-age' ? 's-maxage' : 'max-age'

      describe(`with ${directive} directive`, () => {
        it(`should handle non-numeric values`, () => {
          const response = new Response('test', {
            headers: {
              'cache-control': `${directive}=none, ${otherDirective}=60`,
            },
          })

          const result = createResponseWithMaxAge(response, {
            maxAge: 60,
            sMaxAge: 60,
          })

          expect(result.headers.get('cache-control')).toEqual(`${directive}=none, ${otherDirective}=60`)
        })

        it('should handle empty values', () => {
          const response = new Response('test', {
            headers: {
              'cache-control': `${directive}=, ${otherDirective}=60`,
            },
          })

          const result = createResponseWithMaxAge(response, {
            maxAge: 60,
            sMaxAge: 60,
          })

          expect(result.headers.get('cache-control')).toEqual(`${directive}=0, ${otherDirective}=60`)
        })
      })
    })
  })
})
