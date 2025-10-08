import { beforeEach, describe, expect, it, vi } from 'vitest'
import { patchFetch } from '../../src/instrumentor/patcher/fetch/fetch'
import { setupInstrumentor } from '../../src/instrumentor/instrumentor'
import { wait } from '../utils/wait'
import { FingerprintLoader } from '../../src/instrumentor/types'

vi.mock('../../src/instrumentor/patcher/fetch/fetch')

describe('Instrumentor', () => {
  const mockLoad = vi.fn()
  const mockHandleAgentData = vi.fn()
  const mockPatchFetch = vi.mocked(patchFetch)
  const mockFingerprintLoader = {
    load: mockLoad,
    handleAgentData: mockHandleAgentData,
  } satisfies FingerprintLoader

  beforeEach(() => {
    vi.resetAllMocks()

    Object.defineProperty(globalThis, 'window', {
      value: {
        FingerprintJS: {
          load: mockLoad,
        },
      },
      writable: true,
    })
  })

  it('should load fingerprint when DOM is ready only once', async () => {
    await setupInstrumentor({
      fingerprintLoader: Promise.resolve(mockFingerprintLoader),
      protectedApis: [
        {
          url: '/protected/*',
          method: 'POST',
        },
      ],
    })

    document.dispatchEvent(new Event('DOMContentLoaded'))
    // Wait for the DOM event handler to finish, since dispatchEvent is async
    await wait(100)

    document.dispatchEvent(new Event('DOMContentLoaded'))

    // Wait for the DOM event handler to finish, since dispatchEvent is async
    await wait(100)

    expect(mockLoad).toHaveBeenCalledTimes(1)
  })

  it('should load fingerprint and prepare signals collection', async () => {
    const mockCollect = vi.fn().mockResolvedValue('signals')
    mockLoad.mockResolvedValue({ collect: mockCollect })

    await setupInstrumentor({
      fingerprintLoader: Promise.resolve(mockFingerprintLoader),
      protectedApis: [
        {
          url: '/protected/*',
          method: 'POST',
        },
      ],
    })

    document.dispatchEvent(new Event('DOMContentLoaded'))
    // Wait for the DOM event handler to finish, since dispatchEvent is async
    await wait(100)

    expect(mockLoad).toHaveBeenCalledTimes(1)

    const patcherContext = mockPatchFetch.mock.calls[0][0]
    expect(patcherContext).toBeTruthy()

    expect(await patcherContext.getSignals()).toEqual('signals')
    expect(await patcherContext.getSignals()).toEqual('signals')

    // Assume that the actual signals collection happened only once
    expect(mockCollect).toHaveBeenCalledTimes(1)
  })

  it('should load fingerprint and prepare agent data processing', async () => {
    await setupInstrumentor({
      fingerprintLoader: Promise.resolve(mockFingerprintLoader),
      protectedApis: [
        {
          url: '/protected/*',
          method: 'POST',
        },
      ],
    })

    document.dispatchEvent(new Event('DOMContentLoaded'))
    // Wait for the DOM event handler to finish, since dispatchEvent is async
    await wait(100)

    expect(mockLoad).toHaveBeenCalledTimes(1)

    const patcherContext = mockPatchFetch.mock.calls[0][0]
    expect(patcherContext).toBeTruthy()

    patcherContext.processAgentData('agentData')
    patcherContext.processAgentData('agentData123')

    expect(mockHandleAgentData).toHaveBeenCalledTimes(2)
    expect(mockHandleAgentData).toHaveBeenCalledWith('agentData')
    expect(mockHandleAgentData).toHaveBeenCalledWith('agentData123')
  })
})
