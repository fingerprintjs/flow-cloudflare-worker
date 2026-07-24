import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest'
import { WritablePatcherContext } from '../../../../src/scripts/instrumentor/patcher/context'
import { patchFetch } from '../../../../src/scripts/instrumentor/patcher/fetch/fetch'
import { patchXHR } from '../../../../src/scripts/instrumentor/patcher/xhr/xhr'
import { injectSignalsElement } from '../../../../src/scripts/instrumentor/patcher/form/injectSignalsElement'
import { MockServer } from '../../../utils/mockServer'
import { mockUrl } from '../../../utils/mockEnv'
import { wait } from '../../../utils/wait'

const windowTagKey = '__fp_tag'
const windowLinkedIdKey = '__fp_linked_id'

type XhrBusinessContextOptions = {
  headers?: Array<[string, string]>
  body?: string
}

function setWindowContext(tag?: unknown, linkedId?: string) {
  Object.assign(globalThis, {
    ...(tag === undefined ? {} : { [windowTagKey]: tag }),
    ...(linkedId === undefined ? {} : { [windowLinkedIdKey]: linkedId }),
  })
}

function clearWindowContext() {
  Reflect.deleteProperty(globalThis, windowTagKey)
  Reflect.deleteProperty(globalThis, windowLinkedIdKey)
}

describe('Business context transport combinations', () => {
  afterEach(() => {
    clearWindowContext()
    vi.restoreAllMocks()
  })

  describe('fetch', () => {
    let context: WritablePatcherContext
    let mockedFetch: MockInstance<typeof fetch>

    beforeEach(() => {
      location.href = mockUrl('/')
      mockedFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('signals'))
      Object.defineProperty(globalThis, 'window', {
        value: { fetch: mockedFetch },
        writable: true,
      })

      context = new WritablePatcherContext([
        { method: 'POST', url: mockUrl('/protected/*') },
      ])
      context.setSignalsProvider(async () => 'test-signals')
      vi.spyOn(context, 'getSignals')
    })

    it.each<[string, () => void, RequestInit | undefined]>([
      ['window', () => setWindowContext('window-tag', 'window-linked-id'), undefined],
      [
        'headers',
        () => undefined,
        { headers: { 'fp-tag': 'header-tag', 'fp-linked-id': 'header-linked-id' } },
      ],
      [
        'body',
        () => undefined,
        {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fp_tag: 'body-tag', fp_linked_id: 'body-linked-id' }),
        },
      ],
    ])('passes %s context to getSignals', async (_source, setup, init) => {
      setup()
      patchFetch(context)

      await window.fetch(mockUrl('/protected/endpoint'), { method: 'POST', ...init })

      const expectedContext =
        _source === 'headers'
          ? { tag: 'header-tag', linkedId: 'header-linked-id' }
          : { tag: `${_source}-tag`, linkedId: `${_source}-linked-id` }
      expect(context.getSignals).toHaveBeenCalledWith(expectedContext)
    })

    it('gives body precedence over headers and window per field', async () => {
      setWindowContext('window-tag', 'window-linked-id')
      patchFetch(context)

      await window.fetch(mockUrl('/protected/endpoint'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'fp-tag': 'header-tag',
          'fp-linked-id': 'header-linked-id',
        },
        body: JSON.stringify({ fp_tag: 'body-tag' }),
      })

      expect(context.getSignals).toHaveBeenCalledWith({
        tag: 'body-tag',
        linkedId: 'header-linked-id',
      })
    })

    it('does not resolve business context for unprotected URLs', async () => {
      patchFetch(context)

      await window.fetch(mockUrl('/unprotected'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fp_tag: 'should-not-read' }),
      })

      expect(context.getSignals).not.toHaveBeenCalled()
    })

    it('honors init overrides on fetch(Request, init)', async () => {
      patchFetch(context)

      const request = new Request(mockUrl('/protected/endpoint'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'fp-tag': 'request-tag',
          'fp-linked-id': 'request-linked-id',
        },
        body: JSON.stringify({ fp_tag: 'request-body-tag', fp_linked_id: 'request-body-linked-id' }),
      })

      await window.fetch(request, {
        headers: {
          'content-type': 'application/json',
          'fp-tag': 'init-tag',
          'fp-linked-id': 'init-linked-id',
        },
        body: JSON.stringify({ fp_tag: 'init-body-tag' }),
      })

      expect(context.getSignals).toHaveBeenCalledWith({
        tag: 'init-body-tag',
        linkedId: 'init-linked-id',
      })

      const [forwardedRequest] = mockedFetch.mock.calls[0]
      expect(forwardedRequest).toBeInstanceOf(Request)
      if (!(forwardedRequest instanceof Request)) {
        throw new Error('Expected fetch to receive a Request')
      }
      expect(forwardedRequest.headers.get('fp-tag')).toBe('init-tag')
      await expect(forwardedRequest.clone().json()).resolves.toEqual({ fp_tag: 'init-body-tag' })
    })
  })

  describe('XMLHttpRequest', () => {
    let server: MockServer
    let context: WritablePatcherContext
    const originalOpen = XMLHttpRequest.prototype.open
    const originalSend = XMLHttpRequest.prototype.send
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader

    beforeEach(async () => {
      server = new MockServer(3001)
      await server.listen()
      location.href = server.getUrl('/')

      context = new WritablePatcherContext([
        { method: 'POST', url: server.getUrl('/protected/*') },
      ])
      context.setSignalsProvider(async () => 'test-signals')
      vi.spyOn(context, 'getSignals')
    })

    afterEach(async () => {
      await server.close()
      Object.assign(XMLHttpRequest.prototype, {
        open: originalOpen,
        send: originalSend,
        setRequestHeader: originalSetRequestHeader,
      })
    })

    it.each<[string, () => void, XhrBusinessContextOptions | undefined]>([
      ['window', () => setWindowContext('window-tag', 'window-linked-id'), undefined],
      [
        'headers',
        () => undefined,
        {
          headers: [
            ['fp-tag', 'header-tag'],
            ['fp-linked-id', 'header-linked-id'],
          ],
        },
      ],
      [
        'body',
        () => undefined,
        {
          headers: [['content-type', 'application/json']],
          body: JSON.stringify({ fp_tag: 'body-tag', fp_linked_id: 'body-linked-id' }),
        },
      ],
    ])('passes %s context to getSignals', async (_source, setup, options) => {
      setup()
      patchXHR(context)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', server.getUrl('/protected/endpoint'))
      if (options?.headers) {
        for (const [name, value] of options.headers) {
          xhr.setRequestHeader(name, value)
        }
      }
      xhr.send(options?.body)
      await new Promise<void>((resolve) => xhr.addEventListener('load', () => resolve(), { once: true }))

      const expectedContext =
        _source === 'headers'
          ? { tag: 'header-tag', linkedId: 'header-linked-id' }
          : { tag: `${_source}-tag`, linkedId: `${_source}-linked-id` }
      expect(context.getSignals).toHaveBeenCalledWith(expectedContext)
    })

    it('preserves repeated business context header values', async () => {
      patchXHR(context)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', server.getUrl('/protected/endpoint'))
      xhr.setRequestHeader('fp-tag', 'first')
      xhr.setRequestHeader('FP-TAG', 'second')
      xhr.send()
      await new Promise<void>((resolve) => xhr.addEventListener('load', () => resolve(), { once: true }))

      expect(context.getSignals).toHaveBeenCalledWith({ tag: 'first, second' })
    })

    it('clears fingerprint context when reopening as sync after async', async () => {
      patchXHR(context)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', server.getUrl('/protected/endpoint'))
      xhr.setRequestHeader('fp-tag', 'async-tag')
      xhr.send()
      await new Promise<void>((resolve) => xhr.addEventListener('load', () => resolve(), { once: true }))

      vi.mocked(context.getSignals).mockClear()

      // Sync open must not reuse async fingerprint context (would defer send)
      const originalSend = XMLHttpRequest.prototype.send
      const sendSpy = vi.fn(function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
        return originalSend.call(this, body)
      })
      XMLHttpRequest.prototype.send = sendSpy

      xhr.open('POST', '/unrelated', false)
      xhr.send('sync-body')

      expect(sendSpy).toHaveBeenCalledWith('sync-body')
      expect(context.getSignals).not.toHaveBeenCalled()
    })
  })

  describe('native forms', () => {
    let context: WritablePatcherContext

    beforeEach(() => {
      location.href = mockUrl('/')
      document.body.innerHTML = `
        <form id="business-context-form" action="/protected/submit" method="POST">
          <input name="fp_tag" value="form-tag">
          <input name="fp_linked_id" value="form-linked-id">
        </form>
      `
      context = new WritablePatcherContext([
        { method: 'POST', url: mockUrl('/protected/*') },
      ])
      context.setSignalsProvider(async () => 'test-signals')
      vi.spyOn(context, 'getSignals')
    })

    async function submitForm() {
      const form = document.querySelector<HTMLFormElement>('#business-context-form')
      expect(form).toBeTruthy()
      if (!form) {
        return
      }
      injectSignalsElement(form, context)
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
      await wait(10)
    }

    it('passes form fields to getSignals', async () => {
      await submitForm()

      expect(context.getSignals).toHaveBeenCalledWith({
        tag: 'form-tag',
        linkedId: 'form-linked-id',
      })
    })

    it('passes window context when form fields are absent; custom headers are N/A for native forms', async () => {
      document.querySelector<HTMLInputElement>('input[name="fp_tag"]')?.remove()
      document.querySelector<HTMLInputElement>('input[name="fp_linked_id"]')?.remove()
      setWindowContext('window-tag', 'window-linked-id')

      await submitForm()

      expect(context.getSignals).toHaveBeenCalledWith({
        tag: 'window-tag',
        linkedId: 'window-linked-id',
      })
    })
  })
})
