import { describe, expect, it } from 'vitest'
import {
  appendHeaderValue,
  hasContentType,
  mergeHeaders,
  removeHeaderValue,
  setOrRemoveHeaderField,
  sfDate,
  sfString,
} from '../../src/worker/utils/headers'

describe('Headers', () => {
  describe('hasContentType', () => {
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

  describe('mergeHeaders', () => {
    it('returns a copy of the base headers when no other headers are provided', () => {
      const base = new Headers({ 'X-Foo': 'foo', 'X-Bar': 'bar' })
      const result = mergeHeaders(base)
      expect(result.get('X-Foo')).toEqual('foo')
      expect(result.get('X-Bar')).toEqual('bar')
    })

    it('returns a new Headers instance, not the original', () => {
      const base = new Headers({ 'X-Foo': 'foo' })
      const result = mergeHeaders(base)
      expect(result).not.toBe(base)
    })

    it('does not mutate the base headers', () => {
      const base = new Headers({ 'X-Foo': 'foo' })
      mergeHeaders(base, new Headers({ 'X-Bar': 'bar' }))
      expect(base.has('X-Bar')).toEqual(false)
    })

    it('merges headers from a second Headers object', () => {
      const base = new Headers({ 'X-Foo': 'foo' })
      const other = new Headers({ 'X-Bar': 'bar' })
      const result = mergeHeaders(base, other)
      expect(result.get('X-Foo')).toEqual('foo')
      expect(result.get('X-Bar')).toEqual('bar')
    })

    it('later headers overwrite earlier values for the same key', () => {
      const base = new Headers({ 'X-Foo': 'original' })
      const other = new Headers({ 'X-Foo': 'overwritten' })
      const result = mergeHeaders(base, other)
      expect(result.get('X-Foo')).toEqual('overwritten')
    })

    it('applies multiple extra headers in order, last one wins', () => {
      const base = new Headers({ 'X-Foo': 'first' })
      const second = new Headers({ 'X-Foo': 'second' })
      const third = new Headers({ 'X-Foo': 'third' })
      const result = mergeHeaders(base, second, third)
      expect(result.get('X-Foo')).toEqual('third')
    })

    it('merges multiple extra headers, preserving all unique keys', () => {
      const base = new Headers({ 'X-A': 'a' })
      const second = new Headers({ 'X-B': 'b' })
      const third = new Headers({ 'X-C': 'c' })
      const result = mergeHeaders(base, second, third)
      expect(result.get('X-A')).toEqual('a')
      expect(result.get('X-B')).toEqual('b')
      expect(result.get('X-C')).toEqual('c')
    })

    it('handles an empty base with a populated other', () => {
      const result = mergeHeaders(new Headers(), new Headers({ 'X-Foo': 'foo' }))
      expect(result.get('X-Foo')).toEqual('foo')
    })

    it('handles a populated base with an empty other', () => {
      const result = mergeHeaders(new Headers({ 'X-Foo': 'foo' }), new Headers())
      expect(result.get('X-Foo')).toEqual('foo')
    })
  })

  describe('setOrRemoveHeaderField', () => {
    it('sets the header field when a value is provided', () => {
      const headers = new Headers()
      setOrRemoveHeaderField(headers, 'X-Foo', 'bar')
      expect(headers.get('X-Foo')).toEqual('bar')
    })

    it('overwrites an existing header field when a value is provided', () => {
      const headers = new Headers({ 'X-Foo': 'original' })
      setOrRemoveHeaderField(headers, 'X-Foo', 'updated')
      expect(headers.get('X-Foo')).toEqual('updated')
    })

    it('removes the header field when value is undefined', () => {
      const headers = new Headers({ 'X-Foo': 'bar' })
      setOrRemoveHeaderField(headers, 'X-Foo', undefined)
      expect(headers.has('X-Foo')).toEqual(false)
    })

    it('removes the header field when value is an empty string', () => {
      const headers = new Headers({ 'X-Foo': 'bar' })
      setOrRemoveHeaderField(headers, 'X-Foo', '')
      expect(headers.has('X-Foo')).toEqual(false)
    })

    it('does nothing when removing a header that is not present', () => {
      const headers = new Headers()
      expect(() => setOrRemoveHeaderField(headers, 'X-Foo', undefined)).not.toThrow()
      expect(headers.has('X-Foo')).toEqual(false)
    })

    it('mutates the passed-in headers object', () => {
      const headers = new Headers()
      setOrRemoveHeaderField(headers, 'X-Foo', 'bar')
      expect(headers.get('X-Foo')).toEqual('bar')
    })
  })

  describe('sfString', () => {
    it('wraps a plain value in double quotes', () => {
      expect(sfString('AWS')).toEqual('"AWS"')
    })

    it('wraps and escapes backslashes and double quotes per RFC 9651', () => {
      expect(sfString('a "quoted" \\ value')).toEqual('"a \\"quoted\\" \\\\ value"')
    })
  })

  describe('sfDate', () => {
    it('encodes a millisecond timestamp as @<unix-seconds>, truncating sub-second precision', () => {
      expect(sfDate(1778604975494)).toEqual('@1778604975')
    })
  })
})
