import { describe, expect, it } from 'vitest'
import { hasContentType, removeHeaderValue, appendHeaderValue } from '../../src/worker/utils/headers'

describe('Headers', () => {
  describe('Has content type', () => {
    type TestCase = {
      headers: Headers
      contentType: string
      expected: boolean
    }
    const testCases: TestCase[] = [
      {
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        contentType: 'text/html',
        expected: false,
      },
      {
        headers: new Headers({
          'Content-Type': 'text/html',
        }),
        contentType: 'text/html',
        expected: true,
      },
      {
        headers: new Headers({
          'Content-Type': 'text/html; charset=UTF-8',
        }),
        contentType: 'text/html',
        expected: true,
      },
      {
        headers: new Headers({
          'Content-Type': 'TEXT/HTML; charset=UTF-8',
        }),
        contentType: 'text/html',
        expected: true,
      },
      {
        headers: new Headers({
          'Content-Type': 'text/plain; charset=UTF-8',
        }),
        contentType: 'text/html',
        expected: false,
      },
    ]

    testCases.forEach((testCase, index) => {
      it(`should check for header type #${index}`, () => {
        expect(hasContentType(testCase.headers, testCase.contentType)).toEqual(testCase.expected)
      })
    })
  })

  describe('removeHeaderValue', () => {
    it('removes a value from a comma-separated header', () => {
      const headers = new Headers({
        'X-Test': 'a, b, c',
      })
      removeHeaderValue(headers, 'X-Test', 'b')
      expect(headers.get('X-Test')).toEqual('a,c')
    })

    it('removes the only value and deletes the header', () => {
      const headers = new Headers({
        'X-Test': 'b',
      })
      removeHeaderValue(headers, 'X-Test', 'b')
      expect(headers.has('X-Test')).toEqual(false)
    })

    it('should use a case-insensitive comparison', () => {
      const headers = new Headers({
        'X-Test': 'A, B, C',
      })
      removeHeaderValue(headers, 'X-Test', 'b')
      expect(headers.get('X-Test')).toEqual('A,C')
    })

    it('does nothing if the value is not present', () => {
      const headers = new Headers({
        'X-Test': 'a, c',
      })
      removeHeaderValue(headers, 'X-Test', 'b')
      expect(headers.get('X-Test')).toEqual('a, c')
    })

    it('does nothing if the header field is not present', () => {
      const headers = new Headers()
      removeHeaderValue(headers, 'X-Test', 'b')
      expect(headers.has('X-Test')).toEqual(false)
    })
  })

  describe('appendHeaderValue', () => {
    it('appends the value to the header', () => {
      const headers = new Headers({
        'X-Test': 'a',
      })
      appendHeaderValue(headers, 'X-Test', 'b')
      expect(headers.get('X-Test')).toEqual('a,b')
    })

    it('does not duplicate values, using a case-insensitive comparison', () => {
      const headers = new Headers({
        'X-Test': 'a, B',
      })
      appendHeaderValue(headers, 'X-Test', 'b')
      expect(headers.get('X-Test')).toEqual('a, B')
    })

    it('sets the header if not present', () => {
      const headers = new Headers()
      appendHeaderValue(headers, 'X-Test', 'b')
      expect(headers.get('X-Test')).toEqual('b')
    })

    it('trims whitespace and appends correctly', () => {
      const headers = new Headers({
        'X-Test': ' a , c ',
      })
      appendHeaderValue(headers, 'X-Test', 'b')
      expect(headers.get('X-Test')).toEqual('a,c,b')
    })
  })
})
