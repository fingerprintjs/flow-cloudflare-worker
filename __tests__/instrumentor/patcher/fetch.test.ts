import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { patchFetch } from '../../../src/instrumentor/patcher/fetch'
import { PatcherContext, WritablePatcherContext } from '../../../src/instrumentor/patcher/context'
import { ProtectedApi } from '../../../src/shared/types'
import { SIGNALS_HEADER } from '../../../src/shared/const'

import * as urlUtils from '../../../src/instrumentor/patcher/url'

describe('Fetch Patcher', () => {
  let mockFetch: Mock
  let originalFetch: typeof window.fetch
  let mockContext: PatcherContext

  const mockProtectedApis: ProtectedApi[] = [
    {
      method: 'POST',
      url: '/protected',
      ruleSetId: '1',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(urlUtils, 'isProtectedUrl')

    // Mock window.fetch
    mockFetch = vi.fn()
    originalFetch = globalThis.fetch
    globalThis.fetch = mockFetch

    // Mock window object
    Object.defineProperty(globalThis, 'window', {
      value: { fetch: mockFetch },
      writable: true,
    })

    const writableContext = new WritablePatcherContext()
    writableContext.setSignalsProvider(async () => 'test-signals-data')
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
        }),
        mockProtectedApis
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
        }),
        mockProtectedApis
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

      const response = await window.fetch('https://api.example.com/protected/endpoint')

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/protected/endpoint')
      expect(response.headers.get(SIGNALS_HEADER)).toBeFalsy()
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
  })
})
