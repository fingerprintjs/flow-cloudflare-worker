import { describe, expect, it } from 'vitest'
import {
  extractBusinessContextFromBody,
  extractBusinessContextFromHeaders,
  extractBusinessContextFromRequest,
  extractBusinessContextFromWindow,
  resolveBusinessContext,
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
    it('reads values case-insensitively', () => {
      expect(
        extractBusinessContextFromHeaders(
          new Headers({ 'FP-TAG': 'header-tag', 'fp-linked-id': 'header-linked-id' })
        )
      ).toEqual({
        tag: 'header-tag',
        linkedId: 'header-linked-id',
      })
    })
  })

  describe('extractBusinessContextFromBody', () => {
    it('reads JSON strings', () => {
      expect(
        extractBusinessContextFromBody(
          JSON.stringify({ fp_tag: { source: 'body' }, fp_linked_id: 'body-linked-id' }),
          'application/json'
        )
      ).toEqual({ tag: { source: 'body' }, linkedId: 'body-linked-id' })
    })

    it('reads FormData', () => {
      const body = new FormData()
      body.set('fp_tag', 'form-tag')
      body.set('fp_linked_id', 'form-linked-id')

      expect(extractBusinessContextFromBody(body)).toEqual({
        tag: 'form-tag',
        linkedId: 'form-linked-id',
      })
    })

    it('reads URLSearchParams', () => {
      const body = new URLSearchParams({
        fp_tag: 'params-tag',
        fp_linked_id: 'params-linked-id',
      })

      expect(extractBusinessContextFromBody(body)).toEqual({
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

  describe('resolveBusinessContext normalization', () => {
    it('returns undefined when every source is empty', () => {
      expect(resolveBusinessContext({})).toBeUndefined()
      expect(resolveBusinessContext({ body: { tag: null } })).toBeUndefined()
      expect(resolveBusinessContext({ headers: { tag: '' } })).toBeUndefined()
      expect(resolveBusinessContext({ window: { linkedId: '' } })).toBeUndefined()
    })
  })

  describe('extractBusinessContextFromBody null/empty', () => {
    it('omits null and empty JSON fields', () => {
      expect(
        extractBusinessContextFromBody(
          JSON.stringify({ fp_tag: null, fp_linked_id: '' }),
          'application/json'
        )
      ).toEqual({})
    })

    it('does not infer a string body format without a supported content type', () => {
      expect(extractBusinessContextFromBody(JSON.stringify({ fp_tag: 'ignored' }))).toEqual({})
    })

    it('does not decode Blob bodies', () => {
      const body = new Blob([JSON.stringify({ fp_tag: 'ignored' })], { type: 'application/json' })
      expect(extractBusinessContextFromBody(body, body.type)).toEqual({})
    })
  })
})
