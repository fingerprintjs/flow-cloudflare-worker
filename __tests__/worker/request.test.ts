import { describe, expect, it } from 'vitest'

import { getCrossOriginValue } from '../../src/worker/utils/request'

describe('Request', () => {
  describe('getCrossOriginValue', () => {
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
      expect(getCrossOriginValue(request)).toStrictEqual(expectedOrigin)
    })
  })
})
