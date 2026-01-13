/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest'
import { patchFetch } from '../../../../src/scripts/instrumentor/patcher/fetch/fetch'
import { PatcherContext, WritablePatcherContext } from '../../../../src/scripts/instrumentor/patcher/context'
import { ProtectedApi } from '../../../../src/shared/types'
import { AGENT_DATA_HEADER, SIGNALS_KEY } from '../../../../src/shared/const'
import { mockUrl, mockWorkerBaseUrl } from '../../../utils/mockEnv'

describe('Fetch Patcher', () => {
  let mockContext: PatcherContext

  const mockProcessAgentData = vi.fn()

  const mockProtectedApis: ProtectedApi[] = [
    {
      method: 'POST',
      url: mockUrl('/protected/*'),
    },
  ]

  let mockedFetch: MockInstance<typeof fetch>
  beforeEach(() => {
    location.href = mockWorkerBaseUrl
    vi.clearAllMocks()

    mockedFetch = vi.spyOn(globalThis, 'fetch')

    // Mock window object
    Object.defineProperty(globalThis, 'window', {
      value: { fetch: mockedFetch },
      writable: true,
    })

    const writableContext = new WritablePatcherContext(mockProtectedApis)
    writableContext.setSignalsProvider(async () => 'test-signals-data')
    writableContext.setAgentDataProcessor(mockProcessAgentData)
    mockContext = writableContext
    vi.spyOn(mockContext, 'isProtectedUrl')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('patchFetch', () => {
    it('should patch window.fetch successfully', () => {
      const originalFetch = window.fetch

      patchFetch(mockContext)

      expect(window.fetch).not.toBe(originalFetch)
    })
  })

  describe('patched fetch behavior', () => {
    it('should inject signals for protected URLs with string input', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = mockUrl('/protected/endpoint')
      const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } }

      await window.fetch(url, init)

      expect(mockedFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
        })
      )

      // Check that signals header was added
      const callArgs = mockedFetch.mock.calls[0]
      const actualRequestInit = callArgs[1] as RequestInit

      const headers = actualRequestInit.headers as Headers
      expect(headers.get(SIGNALS_KEY)).toBe('test-signals-data')

      expect(actualRequestInit.credentials).toEqual('include')

      // Check that original parameters were not modified
      expect('credentials' in init).toBeFalsy()
      expect(SIGNALS_KEY in init.headers).toBeFalsy()
    })

    it('should inject signals for protected URLs with string input and relative path', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = '/protected/endpoint'
      const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } }

      await window.fetch(url, init)

      expect(mockedFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: expect.any(Headers),
        })
      )

      // Check that signals header was added
      const callArgs = mockedFetch.mock.calls[0]
      const headers = (callArgs[1] as RequestInit).headers as Headers
      expect(headers.get(SIGNALS_KEY)).toBe('test-signals-data')

      // Check that original parameters were not modified
      expect('credentials' in init).toBeFalsy()
      expect(SIGNALS_KEY in init.headers).toBeFalsy()
    })

    it('should inject signals for protected URLs with string input without requestInit', async () => {
      patchFetch(mockContext)

      vi.mocked(mockContext.isProtectedUrl).mockReturnValue(true)
      mockedFetch.mockResolvedValue(new Response('test'))

      const url = mockUrl('/protected/endpoint')

      await window.fetch(url)

      expect(mockedFetch).toHaveBeenCalledWith(url, {
        headers: expect.any(Headers),
        credentials: 'include',
      })

      // Check that signals header was added
      const callArgs = mockedFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get(SIGNALS_KEY)).toBe('test-signals-data')
    })

    it('should inject signals for protected URLs with URL input', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = new URL(mockUrl('/protected/endpoint'))
      const init = { method: 'POST' }

      await window.fetch(url, init)

      expect(mockContext.isProtectedUrl).toHaveBeenCalledWith(url.toString(), 'POST')
      expect(mockedFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
        })
      )

      const callArgs = mockedFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get(SIGNALS_KEY)).toBe('test-signals-data')

      // Check that original parameters were not modified
      expect('credentials' in init).toBeFalsy()
      expect('headers' in init).toBeFalsy()
    })

    it('should inject signals header for protected URLs with Request input', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const request = new Request(mockUrl('/protected/endpoint'), {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      })

      await window.fetch(request)

      expect(mockContext.isProtectedUrl).toHaveBeenCalledWith(request.url, 'POST')

      const callArgs = mockedFetch.mock.calls[0]
      const actualHeaders =
        typeof callArgs[0] === 'object' && 'headers' in callArgs[0] ? callArgs[0].headers : undefined

      expect(actualHeaders).toBeDefined()
      expect(actualHeaders!.get(SIGNALS_KEY)).toBe('test-signals-data')

      expect(mockedFetch).not.toHaveBeenCalledWith(request)
    })

    it('should skip patching for non-protected URLs', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      // Protected endpoints are /protected/*
      const url = 'https://api.example.com/public'

      await window.fetch(url)

      expect(mockedFetch).toHaveBeenCalledWith(url)
    })

    it('should do nothing when no signals data available', async () => {
      mockedFetch.mockResolvedValue(new Response('test'))

      // Create context without signals
      const emptyContext = new WritablePatcherContext(mockProtectedApis)
      patchFetch(emptyContext)

      await window.fetch(mockUrl('/protected/endpoint'))

      // By checking that fetch was called with EXACTLY one param, we know that no signals were injected
      expect(mockedFetch).toHaveBeenCalledWith(mockUrl('/protected/endpoint'))
    })

    it('should handle unsupported fetch parameters gracefully', async () => {
      patchFetch(mockContext)
      mockedFetch.mockResolvedValue(new Response('test'))

      // @ts-ignore - intentionally passing invalid parameters
      await window.fetch(123, { method: 'GET' })

      expect(mockedFetch).toHaveBeenCalledWith(123, { method: 'GET' })
    })

    it('should call original fetch on error', async () => {
      vi.mocked(mockContext.isProtectedUrl).mockImplementation(() => {
        throw new Error('Test error')
      })

      patchFetch(mockContext)
      mockedFetch.mockResolvedValue(new Response('test'))

      await window.fetch('https://example.org')

      // By checking that fetch was called with EXACTLY one param, we know that no signals were injected
      expect(mockedFetch).toHaveBeenCalledWith('https://example.org')
    })

    it('should call original fetch if signal collection fails', async () => {
      const context = new WritablePatcherContext(mockProtectedApis)
      context.setSignalsProvider(() => {
        throw new Error('Failed to collect signals')
      })

      patchFetch(context)
      mockedFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.org/protected/endpoint'
      await window.fetch(url)

      // By checking that fetch was called with EXACTLY one param, we know that no signals were injected
      expect(mockedFetch).toHaveBeenCalledWith(url)
    })

    it('should handle original fetch throwing error', async () => {
      patchFetch(mockContext)

      const fetchError = new Error('Network error')
      mockedFetch.mockRejectedValue(fetchError)

      await expect(window.fetch('https://api.example.org/protected/endpoint')).rejects.toThrow('Network error')
    })

    it('should handle existing Headers instance in RequestInit', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const existingHeaders = new Headers({ 'Content-Type': 'application/json' })
      const url = mockUrl('/protected/endpoint')

      await window.fetch(url, {
        method: 'POST',
        headers: existingHeaders,
      })

      const callArgs = mockedFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get(SIGNALS_KEY)).toBe('test-signals-data')
    })

    it('should handle existing Headers object in RequestInit', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = mockUrl('/protected/endpoint')

      await window.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const callArgs = mockedFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get(SIGNALS_KEY)).toBe('test-signals-data')
    })

    it('should handle existing Headers tuple in RequestInit', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = mockUrl('/protected/endpoint')

      await window.fetch(url, {
        method: 'POST',
        headers: [['Content-Type', 'application/json']],
      })

      const callArgs = mockedFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get(SIGNALS_KEY)).toBe('test-signals-data')
    })

    it('should overwrite existing signals header', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = mockUrl('/protected/endpoint')
      const headers = { [SIGNALS_KEY]: 'old-signals-data' }

      await window.fetch(url, { method: 'POST', headers })

      const callArgs = mockedFetch.mock.calls[0]
      const resultHeaders = callArgs[1]?.headers as Headers
      expect(resultHeaders.get(SIGNALS_KEY)).toBe('test-signals-data')
    })

    it('should handle Request object with existing headers', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const request = new Request(mockUrl('/protected/endpoint'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      })

      await window.fetch(request)

      expect(request.headers.get('Content-Type')).toBe('application/json')
      expect(request.headers.get('Authorization')).toBe('Bearer token')
      expect(request.headers.get(SIGNALS_KEY)).toBe('test-signals-data')
    })

    it('should handle Request object with existing headers instance', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const request = new Request(mockUrl('/protected/endpoint'), {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        }),
      })

      await window.fetch(request)

      expect(request.headers.get('Content-Type')).toBe('application/json')
      expect(request.headers.get('Authorization')).toBe('Bearer token')
      expect(request.headers.get(SIGNALS_KEY)).toBe('test-signals-data')
    })

    it('should handle URLs with query parameters', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected?param1=value1&param2=value2'

      await window.fetch(url, { method: 'GET' })

      expect(mockContext.isProtectedUrl).toHaveBeenCalledWith(url, 'GET')
    })

    it('should handle URLs with fragments', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = 'https://api.example.com/protected#section'

      await window.fetch(url, { method: 'POST' })

      expect(mockContext.isProtectedUrl).toHaveBeenCalledWith(url, 'POST')
    })

    it('should handle URL object with query parameters and fragments', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = new URL('https://api.example.com/protected?test=1#fragment')

      await window.fetch(url, { method: 'POST' })

      expect(mockContext.isProtectedUrl).toHaveBeenCalledWith(url.toString(), 'POST')
    })

    it('should ignore no-cors request init', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = mockUrl('/protected/endpoint')

      await window.fetch(url, {
        mode: 'no-cors',
      })

      expect(mockedFetch).toHaveBeenCalledWith(url, {
        mode: 'no-cors',
      })

      const callArgs = mockedFetch.mock.calls[0]
      const resultHeaders = callArgs[1]?.headers
      expect(resultHeaders).toBeUndefined()
    })

    it('should ignore no-cors Request', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = mockUrl('/protected/endpoint')

      const request = new Request(url, { method: 'POST', mode: 'no-cors' })
      await window.fetch(request)

      expect(mockedFetch).toHaveBeenCalledWith(request)

      const callArgs = mockedFetch.mock.calls[0]
      const resultHeaders = (callArgs[0] as RequestInit)?.headers
      expect(resultHeaders).toEqual(new Headers())
    })

    it('should handle cors Request', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(new Response('test'))

      const url = mockUrl('/protected/endpoint')

      await window.fetch(new Request(url, { method: 'POST', mode: 'cors' }))

      const callArgs = mockedFetch.mock.calls[0]
      const resultHeaders = (callArgs[0] as RequestInit)?.headers as Headers
      expect(resultHeaders.get(SIGNALS_KEY)).toBe('test-signals-data')
    })

    it('should process agent data', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(
        new Response('test', {
          headers: {
            [AGENT_DATA_HEADER]: 'agent-data',
          },
        })
      )

      const url = mockUrl('/protected/endpoint')

      await window.fetch(new Request(url, { method: 'POST' }))

      expect(mockProcessAgentData).toHaveBeenCalledTimes(1)
      expect(mockProcessAgentData).toHaveBeenCalledWith('agent-data')
    })

    it('should not process agent data for non-protected routes', async () => {
      patchFetch(mockContext)

      mockedFetch.mockResolvedValue(
        new Response('test', {
          headers: {
            [AGENT_DATA_HEADER]: 'agent-data',
          },
        })
      )

      // Protected endpoints are /protected/*
      const url = 'https://api.example.com/public'

      await window.fetch(new Request(url, { method: 'POST' }))

      expect(mockProcessAgentData).toHaveBeenCalledTimes(0)
    })

    it('should not process agent data if no signals were injected', async () => {
      const writableContext = new WritablePatcherContext(mockProtectedApis)
      writableContext.setAgentDataProcessor(mockProcessAgentData)
      // Mock signals provider to return empty string
      writableContext.setSignalsProvider(async () => '')

      patchFetch(writableContext)

      mockedFetch.mockResolvedValue(
        new Response('test', {
          headers: {
            [AGENT_DATA_HEADER]: 'agent-data',
          },
        })
      )

      const url = mockUrl('/protected/endpoint')

      await window.fetch(new Request(url, { method: 'POST' }))

      expect(mockProcessAgentData).toHaveBeenCalledTimes(0)
    })

    it('should return response if agent data processor throws', async () => {
      const writableContext = new WritablePatcherContext(mockProtectedApis)
      writableContext.setAgentDataProcessor(mockProcessAgentData.mockRejectedValueOnce(new Error('Error')))
      writableContext.setSignalsProvider(async () => 'test-signals-data')

      patchFetch(writableContext)

      const mockResponse = new Response('test', {
        headers: {
          [AGENT_DATA_HEADER]: 'agent-data',
        },
      })
      mockedFetch.mockResolvedValue(mockResponse)

      const url = mockUrl('/protected/endpoint')

      const response = await window.fetch(new Request(url, { method: 'POST' }))
      expect(mockProcessAgentData).toHaveBeenCalledTimes(1)
      expect(response).toBe(mockResponse)
    })
  })
})
