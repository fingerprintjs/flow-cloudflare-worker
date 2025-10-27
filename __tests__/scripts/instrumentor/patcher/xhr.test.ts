import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PatcherContext, WritablePatcherContext } from '../../../../src/scripts/instrumentor/patcher/context'
import { ProtectedApi } from '../../../../src/shared/types'
import { AGENT_DATA_HEADER, SIGNALS_KEY } from '../../../../src/shared/const'
import { patchXHR } from '../../../../src/scripts/instrumentor/patcher/xhr/xhr'
import { MockServer } from '../../../utils/mockServer'

async function awaitEvent(request: XMLHttpRequest, event: keyof XMLHttpRequestEventTargetEventMap) {
  return new Promise<void>((resolve) => {
    request.addEventListener(
      event,
      () => {
        resolve()
      },
      { once: true }
    )
  })
}

async function awaitResponse(request: XMLHttpRequest) {
  await awaitEvent(request, 'load')
}

/**
 * Use an instance of Mock HTTP server rather than mocking the actual XHR methods, for more accurate testing.
 * */
let server: MockServer

function withAgentData() {
  server.use((_, res) => {
    res.setHeader(AGENT_DATA_HEADER, 'agent-data')
  })
}

describe('XMLHttpRequest Patcher', () => {
  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send

  let mockContext: PatcherContext
  let mockProtectedApis: ProtectedApi[]

  const mockProcessAgentData = vi.fn()
  const mockSignalsProvider = vi.fn()

  beforeEach(async () => {
    server = new MockServer()

    mockProtectedApis = [
      {
        method: 'POST',
        url: server.getUrl('/protected/*'),
      },
    ]

    await server.listen()

    vi.clearAllMocks()
    location.href = server.getUrl('/')

    const writableContext = new WritablePatcherContext(mockProtectedApis)
    writableContext.setSignalsProvider(mockSignalsProvider)
    writableContext.setAgentDataProcessor(mockProcessAgentData)
    mockContext = writableContext
    vi.spyOn(mockContext, 'isProtectedUrl')
    vi.spyOn(mockContext, 'getSignals')
    vi.spyOn(mockContext, 'processAgentData')

    mockSignalsProvider.mockResolvedValue('test-signals-data')
  })

  afterEach(async () => {
    vi.restoreAllMocks()

    await server.close()

    Object.assign(XMLHttpRequest.prototype, {
      open: originalOpen,
      send: originalSend,
    })
  })

  describe('patchXMLHttpRequest', () => {
    it('should patch XMLHttpRequest successfully', () => {
      patchXHR(mockContext)

      expect(XMLHttpRequest.prototype.open).not.toBe(originalOpen)
      expect(XMLHttpRequest.prototype.send).not.toBe(originalSend)
    })
  })

  describe('patched XHR behavior', () => {
    it('should add signals header for protected URLs with absolute URL', async () => {
      withAgentData()
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()

      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', server.getUrl('/protected/endpoint'))
      xhr.send()

      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).toHaveBeenCalledWith('agent-data')
    })

    it('should add signals header for protected URLs with relative path', async () => {
      withAgentData()
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).toHaveBeenCalledWith('agent-data')
    })

    it('should add signals header for a request with a body', async () => {
      withAgentData()
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send('test')
      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).toHaveBeenCalledWith('agent-data')

      const [request] = server.requests
      expect(request.body?.toString('utf-8')).toEqual('test')
    })

    it('should add signals header for a request with a form data', async () => {
      withAgentData()
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      const data = new FormData()
      data.set('test', 'value')

      xhr.open('POST', '/protected/endpoint')
      xhr.send(data)
      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).toHaveBeenCalledWith('agent-data')

      const [request] = server.requests
      const requestBodyStr = request.body?.toString('utf-8')

      expect(requestBodyStr?.includes('name="test"')).toBe(true)
      expect(requestBodyStr?.includes('value')).toBe(true)
    })

    it('should not add signals header for non-protected URLs', async () => {
      withAgentData()
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('GET', '/public')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).not.toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
    })

    it('should do nothing when no signals data available', async () => {
      withAgentData()

      const emptyContext = new WritablePatcherContext(mockProtectedApis)
      emptyContext.setSignalsProvider(async () => '')
      emptyContext.setAgentDataProcessor(mockProcessAgentData)

      patchXHR(emptyContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).not.toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).not.toHaveBeenCalled()
    })

    it('should not process agent data if it is not available', async () => {
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).not.toHaveBeenCalled()
    })

    it('should call original send on error in isProtectedUrl', async () => {
      withAgentData()

      vi.mocked(mockContext.isProtectedUrl).mockImplementation(() => {
        throw new Error('Test error')
      })
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const sendSpy = vi.spyOn(xhr, 'send')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(sendSpy).toHaveBeenCalled()
    })

    it('should fail silently if signals collection fails', async () => {
      vi.mocked(mockContext.getSignals).mockRejectedValue(new Error('Failed to get signals'))

      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).not.toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).not.toHaveBeenCalledWith('agent-data')
    })

    it('should fail silently if agent processing fails', async () => {
      vi.mocked(mockContext.processAgentData).mockRejectedValue(new Error('Failed to process agent data'))

      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).not.toHaveBeenCalledWith('agent-data')
    })

    it('ignores sync requests correctly', () => {
      vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {
        // No-op to handle sync request in this test. We can't use MockServer for this one, since sync requests block the main thread ;)
      })

      withAgentData()
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint', false) // sync request
      xhr.send()

      // No signals injection and no agent data processing for sync requests
      expect(setHeaderSpy).not.toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')
      expect(mockProcessAgentData).not.toHaveBeenCalled()
    })

    it('preserves existing headers correctly', async () => {
      withAgentData()
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.setRequestHeader('X-Custom', 'abc')
      xhr.send('payload')

      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_KEY, 'test-signals-data')

      const [request] = server.requests
      expect(request.headers['x-custom']).toBe('abc')
      expect(request.headers['fp-data']).toBe('test-signals-data')
    })

    it('handles aborted requests correctly', async () => {
      withAgentData()
      // Delay the server response so we can abort
      server.requestHandler = (_req, res) => {
        setTimeout(() => {
          res.statusCode = 200
          res.end('OK')
        }, 100)
      }

      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()

      const loadendPromise = awaitEvent(xhr, 'loadend')
      const abortPromise = awaitEvent(xhr, 'abort')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      setTimeout(() => xhr.abort(), 10)

      await Promise.all([loadendPromise, abortPromise])

      // No agent data processing on aborted requests
      expect(mockProcessAgentData).not.toHaveBeenCalled()
    })

    // TODO: This doesn't seem to pass. Possible limitation in happy-dom? We could test it in E2E tests instead.
    it.skip('handles timeouts', async () => {
      withAgentData()
      // Delay the server response longer than timeout
      server.requestHandler = (_req, res) => {
        setTimeout(() => {
          res.statusCode = 200
          res.end('OK')
        }, 100)
      }

      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const timeoutPromise = awaitEvent(xhr, 'timeout')
      const loadendPromise = awaitEvent(xhr, 'loadend')

      xhr.open('POST', '/protected/endpoint')
      xhr.timeout = 10
      xhr.ontimeout = () => {
        // This is never triggered.
        console.log('timeout')
      }
      xhr.send()

      await Promise.all([timeoutPromise, loadendPromise])

      // Request should have been sent and included signals despite timing out
      expect(server.requests.length).toBe(1)
      const [request] = server.requests
      expect(request.headers['fp-data']).toBe('test-signals-data')

      // No agent data processing on timeout
      expect(mockProcessAgentData).not.toHaveBeenCalled()
    })

    it('handles two requests reusing the same xhr object correctly', async () => {
      withAgentData()
      patchXHR(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      // First request
      xhr.open('POST', '/protected/one')
      xhr.send()
      await awaitResponse(xhr)

      // Second request reusing same XHR instance
      xhr.open('POST', '/protected/two')
      xhr.send()
      await awaitResponse(xhr)

      // Signals header should be set for both requests separately
      const calls = setHeaderSpy.mock.calls.filter((c) => c[0] === SIGNALS_KEY)
      expect(calls.length).toBeGreaterThanOrEqual(2)

      // Agent data processed twice
      expect(mockProcessAgentData).toHaveBeenCalledTimes(2)

      // Signals provider should be called only once. On the second request it should use cached signals data
      expect(mockSignalsProvider).toHaveBeenCalledTimes(1)

      // Server received two separate requests with signals header
      expect(server.requests.length).toBe(2)
      expect(server.requests[0].headers['fp-data']).toBe('test-signals-data')
      expect(server.requests[1].headers['fp-data']).toBe('test-signals-data')
    })
  })
})
