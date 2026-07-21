import { describe, expect, it, vi } from 'vitest'
import {
  extractBusinessContextFromBody,
  extractBusinessContextFromHeaders,
  extractBusinessContextFromRequest,
  extractBusinessContextFromWindow,
  resolveBusinessContext,
  toCollectOptions,
} from '../../../../src/scripts/instrumentor/patcher/businessContext'

describe('Business context', () => {
  describe('resolveBusinessContext', () => {
    it('uses body before headers before window, independently for each field', () => {
      expect(
        resolveBusinessContext({
          body: { tag: 'body-tag' },
          headers: { tag: 'header-tag', linkedId: 'header-linked-id' },
          window: { tag: 'window-tag', linkedId: 'window-linked-id' },
        })
      ).toEqual({ tag: 'body-tag', linkedId: 'header-linked-id' })
    })
  })

  describe('extractBusinessContextFromWindow', () => {
    it('reads window values', () => {
      const target = {
        __fp_tag: { source: 'window' },
        __fp_linked_id: 'window-linked-id',
      } satisfies Record<string, unknown>

      expect(extractBusinessContextFromWindow(target)).toEqual({
        tag: { source: 'window' },
        linkedId: 'window-linked-id',
      })
    })
  })

  describe('extractBusinessContextFromHeaders', () => {
    it.each([
      ['Headers', new Headers({ 'fp-tag': 'header-tag', 'fp-linked-id': 'header-linked-id' })],
      ['record', { 'FP-TAG': 'header-tag', 'fp-linked-id': 'header-linked-id' }],
      ['Map', new Map([['fp-tag', 'header-tag'], ['fp-linked-id', 'header-linked-id']])],
    ])('reads values from %s', (_name, headers) => {
      expect(extractBusinessContextFromHeaders(headers)).toEqual({
        tag: 'header-tag',
        linkedId: 'header-linked-id',
      })
    })
  })

  describe('extractBusinessContextFromBody', () => {
    it('reads JSON strings', async () => {
      await expect(
        extractBusinessContextFromBody(
          JSON.stringify({ fp_tag: { source: 'body' }, fp_linked_id: 'body-linked-id' }),
          'application/json'
        )
      ).resolves.toEqual({ tag: { source: 'body' }, linkedId: 'body-linked-id' })
    })

    it('reads FormData', async () => {
      const body = new FormData()
      body.set('fp_tag', 'form-tag')
      body.set('fp_linked_id', 'form-linked-id')

      await expect(extractBusinessContextFromBody(body)).resolves.toEqual({
        tag: 'form-tag',
        linkedId: 'form-linked-id',
      })
    })

    it('reads URLSearchParams', async () => {
      const body = new URLSearchParams({
        fp_tag: 'params-tag',
        fp_linked_id: 'params-linked-id',
      })

      await expect(extractBusinessContextFromBody(body)).resolves.toEqual({
        tag: 'params-tag',
        linkedId: 'params-linked-id',
      })
    })
  })

  it('reads a Request body from a clone without consuming the original', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fp_tag: 'request-tag', fp_linked_id: 'request-linked-id' }),
    })

    await expect(extractBusinessContextFromRequest(request)).resolves.toEqual({
      tag: 'request-tag',
      linkedId: 'request-linked-id',
    })
    expect(request.bodyUsed).toBe(false)
  })

  describe('toCollectOptions', () => {
    it('returns undefined for an empty context', () => {
      expect(toCollectOptions({})).toBeUndefined()
    })

    it('treats null and empty string as absent', () => {
      expect(toCollectOptions({ tag: null })).toBeUndefined()
      expect(toCollectOptions({ tag: '' })).toBeUndefined()
      expect(toCollectOptions({ linkedId: '' })).toBeUndefined()
    })

    it('returns the context when either field is present', () => {
      expect(toCollectOptions({ tag: 'signup' })).toEqual({ tag: 'signup' })
      expect(toCollectOptions({ linkedId: 'linked-id' })).toEqual({ linkedId: 'linked-id' })
    })
  })

  describe('extractBusinessContextFromBody null/empty', () => {
    it('omits null and empty JSON fields', async () => {
      await expect(
        extractBusinessContextFromBody(
          JSON.stringify({ fp_tag: null, fp_linked_id: '' }),
          'application/json'
        )
      ).resolves.toEqual({})
    })

    it('does not decode binary Blob bodies with non-parsable content types', async () => {
      const body = new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'application/octet-stream' })
      const textSpy = vi.spyOn(body, 'text')

      await expect(extractBusinessContextFromBody(body)).resolves.toEqual({})
      expect(textSpy).not.toHaveBeenCalled()
    })
  })
})
