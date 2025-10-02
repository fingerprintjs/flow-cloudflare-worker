import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { patchFetch } from '../../../src/instrumentor/patcher/fetch/fetch'
import { PatcherContext, WritablePatcherContext } from '../../../src/instrumentor/patcher/context'
import { ProtectedApi } from '../../../src/shared/types'
import { AGENT_DATA_HEADER, SIGNALS_HEADER } from '../../../src/shared/const'

import * as urlUtils from '../../../src/shared/protectedApi'

describe('Fetch Patcher', () => {
  let originalFetch: typeof window.fetch
  let mockContext: PatcherContext

  const mockAgentDataProcessor = vi.fn()
  const mockFetch = vi.fn()

  const mockProtectedApis: ProtectedApi[] = [
    {
      method: 'POST',
      url: '/protected',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(urlUtils, 'isProtectedUrl')

    originalFetch = globalThis.fetch
    globalThis.fetch = mockFetch

    // Mock window object
    Object.defineProperty(globalThis, 'window', {
      value: { fetch: mockFetch },
      writable: true,
    })

    const writableContext = new WritablePatcherContext()
    writableContext.setSignalsProvider(async () => 'test-signals-data')
    writableContext.setAgentDataProcessor(mockAgentDataProcessor)
    mockContext = writableContext
  })

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('patchFetch', () => {
    it('should patch window.fetch successfully', () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      expect(fetch).not.toBe(originalFetch)
    })
  })

  describe('patched fetch behavior', () => {
    it('should add signals header for protected URLs with string input', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected/endpoint'
      const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } }

      await window.fetch(url, init)

      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
        })
      )

      // Check that signals header was added
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers as Headers
      expect(headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should add signals header for protected URLs with string input without requestInit', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected/endpoint'

      await window.fetch(url)

      expect(mockFetch).toHaveBeenCalledWith(url, {
        headers: expect.any(Headers),
      })

      // Check that signals header was added
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should add signals header for protected URLs with URL input', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = new URL('https://api.example.com/protected/endpoint')
      const init = { method: 'GET' }

      await window.fetch(url, init)

      expect(urlUtils.isProtectedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: url.toString(),
          method: 'GET',
          protectedApis: mockProtectedApis,
        })
      )
      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      )

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should add signals header for protected URLs with Request input', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const request = new Request('https://api.example.com/protected/endpoint', {
        method: 'PUT',
        headers: { Authorization: 'Bearer token' },
      })

      await window.fetch(request)

      expect(urlUtils.isProtectedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: request.url,
          method: 'PUT',
          protectedApis: mockProtectedApis,
        })
      )

      // Request headers should be modified directly
      expect(request.headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
      expect(mockFetch).toHaveBeenCalledWith(request)
    })

    it('should skip patching for non-protected URLs', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(false)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://other.example.com/endpoint'

      await window.fetch(url)

      expect(mockFetch).toHaveBeenCalledWith(url)
    })

    it('should do nothing when no signals data available', async () => {
      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      // Create context without signals
      const emptyContext = new WritablePatcherContext()
      patchFetch({ protectedApis: mockProtectedApis, ctx: emptyContext })

      await window.fetch('https://api.example.com/protected/endpoint')

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/protected/endpoint')
    })

    it('should handle unsupported fetch parameters gracefully', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })
      mockFetch.mockResolvedValue(new Response('test'))

      // @ts-ignore - intentionally passing invalid parameters
      await window.fetch(123, { method: 'GET' })

      expect(mockFetch).toHaveBeenCalledWith(123, { method: 'GET' })
    })

    it('should call original fetch on error', async () => {
      vi.mocked(urlUtils.isProtectedUrl).mockImplementation(() => {
        throw new Error('Test error')
      })

      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })
      mockFetch.mockResolvedValue(new Response('test'))

      await window.fetch('https://example.org')

      expect(mockFetch).toHaveBeenCalledWith('https://example.org')
    })

    it('should call original fetch if signal collection fails', async () => {
      vi.mocked(urlUtils.isProtectedUrl).mockImplementation(() => {
        throw new Error('Test error')
      })
      const context = new WritablePatcherContext()
      context.setSignalsProvider(() => {
        throw new Error('Failed to collect signals')
      })

      patchFetch({ protectedApis: mockProtectedApis, ctx: context })
      mockFetch.mockResolvedValue(new Response('test'))

      await window.fetch('https://example.org')

      expect(mockFetch).toHaveBeenCalledWith('https://example.org')
    })

    it('should handle original fetch throwing error', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      const fetchError = new Error('Network error')
      mockFetch.mockRejectedValue(fetchError)

      await expect(window.fetch('https://example.com')).rejects.toThrow('Network error')
    })

    it('should handle existing Headers instance in RequestInit', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const existingHeaders = new Headers({ 'Content-Type': 'application/json' })
      const url = 'https://api.example.com/protected'

      await window.fetch(url, {
        method: 'POST',
        headers: existingHeaders,
      })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should handle existing Headers object in RequestInit', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected'

      await window.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should handle existing Headers tuple in RequestInit', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected'

      await window.fetch(url, {
        method: 'POST',
        headers: [['Content-Type', 'application/json']],
      })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should overwrite existing signals header', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected'
      const headers = { [SIGNALS_HEADER]: 'old-signals-data' }

      await window.fetch(url, { method: 'POST', headers })

      const callArgs = mockFetch.mock.calls[0]
      const resultHeaders = callArgs[1]?.headers as Headers
      expect(resultHeaders.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should handle Request object with existing headers', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const request = new Request('https://api.example.com/protected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      })

      await window.fetch(request)

      expect(request.headers.get('Content-Type')).toBe('application/json')
      expect(request.headers.get('Authorization')).toBe('Bearer token')
      expect(request.headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should handle Request object with existing headers instance', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const request = new Request('https://api.example.com/protected', {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        }),
      })

      await window.fetch(request)

      expect(request.headers.get('Content-Type')).toBe('application/json')
      expect(request.headers.get('Authorization')).toBe('Bearer token')
      expect(request.headers.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should handle URLs with query parameters', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected?param1=value1&param2=value2'

      await window.fetch(url, { method: 'GET' })

      expect(urlUtils.isProtectedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url,
          method: 'GET',
          protectedApis: mockProtectedApis,
        })
      )
    })

    it('should handle URLs with fragments', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected#section'

      await window.fetch(url, { method: 'POST' })

      expect(urlUtils.isProtectedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url,
          method: 'POST',
          protectedApis: mockProtectedApis,
        })
      )
    })

    it('should handle URL object with query parameters and fragments', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = new URL('https://api.example.com/protected?test=1#fragment')

      await window.fetch(url, { method: 'PATCH' })

      expect(urlUtils.isProtectedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: url.toString(),
          method: 'PATCH',
          protectedApis: mockProtectedApis,
        })
      )
    })

    it('should handle no-cors Request', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected'

      await window.fetch(new Request(url, { method: 'POST', mode: 'no-cors' }))

      const callArgs = mockFetch.mock.calls[0]
      const resultHeaders = callArgs[0]?.headers as Headers
      expect(resultHeaders.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should handle cors Request', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected'

      await window.fetch(new Request(url, { method: 'POST', mode: 'cors' }))

      const callArgs = mockFetch.mock.calls[0]
      const resultHeaders = callArgs[0]?.headers as Headers
      expect(resultHeaders.get(SIGNALS_HEADER)).toBe('test-signals-data')
    })

    it('should process agent data', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(
        new Response('test', {
          headers: {
            [AGENT_DATA_HEADER]: 'agent-data',
          },
        })
      )

      const url = 'https://api.example.com/protected'

      await window.fetch(new Request(url, { method: 'POST' }))

      expect(mockAgentDataProcessor).toHaveBeenCalledTimes(1)
      expect(mockAgentDataProcessor).toHaveBeenCalledWith('agent-data')
    })

    it('should not process agent data for non-protected routes', async () => {
      patchFetch({ protectedApis: mockProtectedApis, ctx: mockContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(false)
      mockFetch.mockResolvedValue(
        new Response('test', {
          headers: {
            [AGENT_DATA_HEADER]: 'agent-data',
          },
        })
      )

      const url = 'https://api.example.com/protected'

      await window.fetch(new Request(url, { method: 'POST' }))

      expect(mockAgentDataProcessor).toHaveBeenCalledTimes(0)
    })

    it('should not process agent data if no signals were injected', async () => {
      const writableContext = new WritablePatcherContext()
      writableContext.setAgentDataProcessor(mockAgentDataProcessor)

      patchFetch({ protectedApis: mockProtectedApis, ctx: writableContext })

      vi.mocked(urlUtils.isProtectedUrl).mockReturnValue(true)
      mockFetch.mockResolvedValue(
        new Response('test', {
          headers: {
            [AGENT_DATA_HEADER]: 'agent-data',
          },
        })
      )

      const url = 'https://api.example.com/protected'

      await window.fetch(new Request(url, { method: 'POST' }))

      expect(mockAgentDataProcessor).toHaveBeenCalledTimes(0)
    })
  })
})
