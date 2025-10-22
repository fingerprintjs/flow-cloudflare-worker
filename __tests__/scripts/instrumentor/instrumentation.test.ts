import { beforeEach, describe, expect, it, vi } from 'vitest'
import { patchFetch } from '../../../src/scripts/instrumentor/patcher/fetch/fetch'
import { setupInstrumentor } from '../../../src/scripts/instrumentor/instrumentor'
import { wait } from '../../utils/wait'
import { FingerprintLoader } from '../../../src/scripts/shared/fingerprint/types'
import { mockUrl } from '../../utils/mockEnv'

vi.mock('../../../src/scripts/instrumentor/patcher/fetch/fetch')

describe('Instrumentor', () => {
  const mockStart = vi.fn()
  const mockHandleAgentData = vi.fn()
  const mockPatchFetch = vi.mocked(patchFetch)
  const mockFingerprintLoader = {
    start: mockStart,
    handleAgentData: mockHandleAgentData,
  } satisfies FingerprintLoader

  beforeEach(() => {
    vi.resetAllMocks()

    Object.defineProperty(globalThis, 'window', {
      value: {
        FingerprintJS: {
          load: mockStart,
        },
      },
      writable: true,
    })
  })

  it('should load fingerprint when DOM is ready only once', async () => {
    await setupInstrumentor({
      endpoint: '/custom',
      fingerprintLoader: Promise.resolve(mockFingerprintLoader),
      protectedApis: [
        {
          url: mockUrl('/protected/*'),
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

    expect(mockStart).toHaveBeenCalledTimes(1)
  })

  it('should load fingerprint and prepare signals collection', async () => {
    const mockCollect = vi.fn().mockResolvedValue('signals')
    mockStart.mockResolvedValue({ collect: mockCollect })

    await setupInstrumentor({
      fingerprintLoader: Promise.resolve(mockFingerprintLoader),
      endpoint: '/custom',
      protectedApis: [
        {
          url: mockUrl('/protected/*'),
          method: 'POST',
        },
      ],
    })

    document.dispatchEvent(new Event('DOMContentLoaded'))
    // Wait for the DOM event handler to finish, since dispatchEvent is async
    await wait(100)

    expect(mockStart).toHaveBeenCalledTimes(1)

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
      endpoint: '/custom',
      protectedApis: [
        {
          url: mockUrl('/protected/*'),
          method: 'POST',
        },
      ],
    })

    document.dispatchEvent(new Event('DOMContentLoaded'))
    // Wait for the DOM event handler to finish, since dispatchEvent is async
    await wait(100)

    expect(mockStart).toHaveBeenCalledTimes(1)

    const patcherContext = mockPatchFetch.mock.calls[0][0]
    expect(patcherContext).toBeTruthy()

    patcherContext.processAgentData('agentData')

    expect(mockHandleAgentData).toHaveBeenCalledTimes(1)
    expect(mockHandleAgentData).toHaveBeenCalledWith('agentData')
  })

  it('should load fingerprint with custom endpoint', async () => {
    await setupInstrumentor({
      fingerprintLoader: Promise.resolve(mockFingerprintLoader),
      endpoint: '/custom',
      protectedApis: [
        {
          url: mockUrl('/protected/*'),
          method: 'POST',
        },
      ],
    })

    document.dispatchEvent(new Event('DOMContentLoaded'))
    // Wait for the DOM event handler to finish, since dispatchEvent is async
    await wait(100)

    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenCalledWith({
      endpoints: '/custom',
    })
  })
})
