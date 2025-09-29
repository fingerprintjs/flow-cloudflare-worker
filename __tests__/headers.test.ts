import { describe, expect, it } from 'vitest'
import { hasContentType } from '../src/worker/utils/headers'

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
})
