import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PatcherContext, WritablePatcherContext } from '../../../src/instrumentor/patcher/context'
import { ProtectedApi } from '../../../src/shared/types'
import { AGENT_DATA_HEADER, SIGNALS_HEADER } from '../../../src/shared/const'
import { patchXMLHttpRequest } from '../../../src/instrumentor/patcher/xml-http-request/xhr'
import { MockServer } from '../../utils/mockServer'

async function awaitResponse(request: XMLHttpRequest) {
  return new Promise<void>((resolve) => {
    request.addEventListener('load', () => {
      resolve()
    })
  })
}

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
    writableContext.setSignalsProvider(async () => 'test-signals-data')
    writableContext.setAgentDataProcessor(mockProcessAgentData)
    mockContext = writableContext
    vi.spyOn(mockContext, 'isProtectedUrl')
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
      const originalOpen = (XMLHttpRequest as any).prototype.open
      const originalSend = (XMLHttpRequest as any).prototype.send

      patchXMLHttpRequest(mockContext)

      expect((XMLHttpRequest as any).prototype.open).not.toBe(originalOpen)
      expect((XMLHttpRequest as any).prototype.send).not.toBe(originalSend)
    })
  })

  describe('patched XHR behavior', () => {
    it('should add signals header for protected URLs with absolute URL', async () => {
      withAgentData()
      patchXMLHttpRequest(mockContext)

      const xhr = new XMLHttpRequest()

      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', server.getUrl('/protected/endpoint'))
      xhr.send()

      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_HEADER, 'test-signals-data')
      expect(mockProcessAgentData).toHaveBeenCalledWith('agent-data')
    })

    it('should add signals header for protected URLs with relative path', async () => {
      withAgentData()
      patchXMLHttpRequest(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_HEADER, 'test-signals-data')
      expect(mockProcessAgentData).toHaveBeenCalledWith('agent-data')
    })

    it('should not add signals header for non-protected URLs', async () => {
      withAgentData()
      patchXMLHttpRequest(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr as any, 'setRequestHeader')

      xhr.open('GET', '/public')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).not.toHaveBeenCalledWith(SIGNALS_HEADER, 'test-signals-data')
    })

    it('should do nothing when no signals data available', async () => {
      withAgentData()

      const emptyContext = new WritablePatcherContext(mockProtectedApis)
      emptyContext.setSignalsProvider(async () => '')
      emptyContext.setAgentDataProcessor(mockProcessAgentData)

      patchXMLHttpRequest(emptyContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).not.toHaveBeenCalledWith(SIGNALS_HEADER, 'test-signals-data')
      expect(mockProcessAgentData).not.toHaveBeenCalled()
    })

    it('should not process agent data if it is not available', async () => {
      patchXMLHttpRequest(mockContext)

      const xhr = new XMLHttpRequest()
      const setHeaderSpy = vi.spyOn(xhr, 'setRequestHeader')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(setHeaderSpy).toHaveBeenCalledWith(SIGNALS_HEADER, 'test-signals-data')
      expect(mockProcessAgentData).not.toHaveBeenCalled()
    })

    it('should call original send on error in isProtectedUrl', async () => {
      withAgentData()

      vi.mocked(mockContext.isProtectedUrl).mockImplementation(() => {
        throw new Error('Test error')
      })
      patchXMLHttpRequest(mockContext)

      const xhr = new XMLHttpRequest()
      const sendSpy = vi.spyOn(xhr, 'send')

      xhr.open('POST', '/protected/endpoint')
      xhr.send()
      await awaitResponse(xhr)

      expect(sendSpy).toHaveBeenCalled()
    })
  })
})
