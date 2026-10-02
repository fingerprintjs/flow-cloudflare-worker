import { describe, expect, it } from 'vitest'
import { shouldSkipEdgeRequest, STATIC_ASSET_DESTINATIONS } from '../../src/worker/utils/edgeFilter'
import { mockEnv, mockUrl } from '../utils/mockEnv'
import { TypedEnv } from '../../src/worker/types'

function createRequest(method: string, destination?: string) {
  const headers = new Headers()
  if (destination !== undefined) {
    headers.set('Sec-Fetch-Dest', destination)
  }

  return new Request(mockUrl('/assets/app.js'), { method, headers })
}

describe('shouldSkipEdgeRequest', () => {
  describe.each([...STATIC_ASSET_DESTINATIONS])('static destination %s', (destination) => {
    it.each(['GET', 'HEAD'])('skips on %s', (method) => {
      expect(shouldSkipEdgeRequest(createRequest(method, destination), mockEnv)).toBe(true)
    })

    it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('does not skip on %s', (method) => {
      expect(shouldSkipEdgeRequest(createRequest(method, destination), mockEnv)).toBe(false)
    })
  })

  it.each([
    ['document', 'document'],
    ['iframe', 'iframe'],
    ['frame', 'frame'],
    ['embed', 'embed'],
    ['object', 'object'],
    ['empty', 'empty'],
    ['empty string', ''],
    ['unknown value', 'bogus'],
    ['different case', 'Script'],
    ['list of values', 'script, image'],
  ])('does not skip for %s', (_, destination) => {
    expect(shouldSkipEdgeRequest(createRequest('GET', destination), mockEnv)).toBe(false)
  })

  it('does not skip when Sec-Fetch-Dest is missing', () => {
    expect(shouldSkipEdgeRequest(createRequest('GET'), mockEnv)).toBe(false)
  })

  it.each([
    ['unset', undefined, true],
    ['empty', '', true],
    ['true', 'true', true],
    ['false', 'false', false],
    ['boolean true', true, true],
    ['boolean false', false, false],
    ['invalid', 'yes', false],
  ])('FP_EDGE_SKIP_STATIC_ASSETS %s', (_, value, expected) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const env = { ...mockEnv, FP_EDGE_SKIP_STATIC_ASSETS: value } as TypedEnv

    expect(shouldSkipEdgeRequest(createRequest('GET', 'script'), env)).toBe(expected)
  })
})
