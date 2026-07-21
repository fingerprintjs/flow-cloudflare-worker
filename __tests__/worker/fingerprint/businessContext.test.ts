import { describe, expect, it, vi } from 'vitest'
import {
  extractAndStripBusinessContextFromForm,
  extractAndStripBusinessContextFromHeaders,
  normalizeBusinessContext,
  resolveBusinessContext,
  tryExtractBusinessContextFromBody,
} from '../../../src/worker/fingerprint/businessContext'
import { HEADER_LINKED_ID_KEY, HEADER_TAG_KEY } from '../../../src/shared/businessContext'
import { IdentificationClient } from '../../../src/worker/fingerprint/identificationClient'
import { SIGNALS_KEY } from '../../../src/shared/const'

describe('worker business context', () => {
  describe('resolveBusinessContext', () => {
    it('uses body before headers, independently per field', () => {
      expect(
        resolveBusinessContext({
          body: { tag: 'body-tag' },
          headers: { tag: 'header-tag', linkedId: 'header-linked-id' },
        })
      ).toEqual({ tag: 'body-tag', linkedId: 'header-linked-id' })
    })
  })

  describe('normalizeBusinessContext', () => {
    it('treats null and empty string as absent', () => {
      expect(normalizeBusinessContext({ tag: null, linkedId: '' })).toBeUndefined()
      expect(normalizeBusinessContext({ tag: '', linkedId: 'id' })).toEqual({ linkedId: 'id' })
    })
  })

  describe('extractAndStripBusinessContextFromHeaders', () => {
    it('reads and strips Flow-owned headers', () => {
      const headers = new Headers({
        [HEADER_TAG_KEY]: JSON.stringify({ source: 'header' }),
        [HEADER_LINKED_ID_KEY]: 'header-linked-id',
        'x-keep': 'yes',
      })

      expect(extractAndStripBusinessContextFromHeaders(headers)).toEqual({
        tag: { source: 'header' },
        linkedId: 'header-linked-id',
      })
      expect(headers.get(HEADER_TAG_KEY)).toBeNull()
      expect(headers.get(HEADER_LINKED_ID_KEY)).toBeNull()
      expect(headers.get('x-keep')).toBe('yes')
    })
  })

  describe('extractAndStripBusinessContextFromForm', () => {
    it('reads and strips form fields', () => {
      const data = new URLSearchParams({
        fp_tag: 'form-tag',
        fp_linked_id: 'form-linked-id',
        login: 'user',
      })

      expect(extractAndStripBusinessContextFromForm(data)).toEqual({
        context: { tag: 'form-tag', linkedId: 'form-linked-id' },
        didStrip: true,
      })
      expect(data.get('fp_tag')).toBeNull()
      expect(data.get('login')).toBe('user')
    })
  })

  describe('tryExtractBusinessContextFromBody', () => {
    it('strips top-level JSON fields', async () => {
      const body = JSON.stringify({
        fp_tag: { source: 'body' },
        fp_linked_id: 'body-linked-id',
        orderId: 1,
      })
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(body.length),
        },
        body,
      })

      const result = await tryExtractBusinessContextFromBody(request)
      expect(result?.context).toEqual({ tag: { source: 'body' }, linkedId: 'body-linked-id' })
      expect(JSON.parse(String(result?.body))).toEqual({ orderId: 1 })
    })

    it('skips buffering when Content-Length is missing or over budget', async () => {
      const largeBody = JSON.stringify({ fp_tag: 'x', payload: 'y'.repeat(300_000) })
      const overBudget = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(largeBody.length),
        },
        body: largeBody,
      })
      await expect(tryExtractBusinessContextFromBody(overBudget)).resolves.toBeUndefined()

      const noLength = new Request('https://example.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fp_tag: 'x' }),
      })
      // undici may auto-set Content-Length; force-clear for the spike gate
      const headers = new Headers(noLength.headers)
      headers.delete('Content-Length')
      const noLengthForced = new Request(noLength, { headers })
      await expect(tryExtractBusinessContextFromBody(noLengthForced)).resolves.toBeUndefined()
    })

    it('skips JSON parse when Flow-owned keys are absent', async () => {
      const body = JSON.stringify({ orderId: 1, payload: true })
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(body.length),
        },
        body,
      })
      await expect(tryExtractBusinessContextFromBody(request)).resolves.toBeUndefined()
    })
  })

  describe('IdentificationClient.parseIncomingRequest + send wiring', () => {
    it('prefers body over headers and injects SendBody fields', async () => {
      const body = JSON.stringify({
        fp_tag: 'body-tag',
        fp_linked_id: 'body-linked-id',
        payload: true,
      })
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          [SIGNALS_KEY]: 'signals',
          [HEADER_TAG_KEY]: 'header-tag',
          [HEADER_LINKED_ID_KEY]: 'header-linked-id',
          'Content-Type': 'application/json',
          'Content-Length': String(body.length),
          host: 'example.com',
          'user-agent': 'test',
          'cf-connecting-ip': '1.2.3.4',
        },
        body,
      })

      const parsed = await IdentificationClient.parseIncomingRequest(request)
      expect(parsed.businessContext).toEqual({ tag: 'body-tag', linkedId: 'body-linked-id' })
      expect(parsed.originRequest.headers.get(HEADER_TAG_KEY)).toBeNull()
      expect(parsed.originRequest.headers.get(SIGNALS_KEY)).toBeNull()
      expect(await parsed.originRequest.json()).toEqual({ payload: true })
    })

    it('round-trips non-string tags through header transport encoding', () => {
      const headers = new Headers({
        [HEADER_TAG_KEY]: JSON.stringify(123),
      })
      expect(extractAndStripBusinessContextFromHeaders(headers)).toEqual({ tag: 123 })
    })

    it('extracts form body fields when signals are in the form', async () => {
      const body = new URLSearchParams({
        [SIGNALS_KEY]: 'signals',
        fp_tag: 'form-tag',
        fp_linked_id: 'form-linked-id',
        login: 'user',
      })

      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          host: 'example.com',
          'user-agent': 'test',
          'cf-connecting-ip': '1.2.3.4',
        },
        body,
      })

      const parsed = await IdentificationClient.parseIncomingRequest(request)
      expect(parsed.businessContext).toEqual({ tag: 'form-tag', linkedId: 'form-linked-id' })
      expect(await parsed.originRequest.text()).toBe('login=user')
    })
  })

  describe('IdentificationClient.send', () => {
    it('includes tag and linked_id on SendBody', async () => {
      const fetchMock = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            agent_data: 'agent',
            event: {
              replayed: false,
              timestamp: new Date().toISOString(),
              url: 'https://example.com/',
              ip_address: '1.2.3.4',
              ip_info: { v4: { address: '1.2.3.4' } },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = new IdentificationClient('us', 'api.fpjs.io', 'secret', 'fpjs', 'r_1')
      const clientRequest = new Request('https://example.com/api', {
        headers: {
          host: 'example.com',
          'user-agent': 'test',
          'cf-connecting-ip': '1.2.3.4',
        },
      })

      await client.send(clientRequest, 'signals', undefined, {
        tag: { source: 'test' },
        linkedId: 'linked-123',
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const ingressRequest = fetchMock.mock.calls[0]?.[0]
      expect(ingressRequest).toBeInstanceOf(Request)
      if (!(ingressRequest instanceof Request)) {
        return
      }
      const body = await ingressRequest.json()
      expect(body).toMatchObject({
        fingerprint_data: 'signals',
        tag: { source: 'test' },
        linked_id: 'linked-123',
      })

      vi.unstubAllGlobals()
    })
  })
})
