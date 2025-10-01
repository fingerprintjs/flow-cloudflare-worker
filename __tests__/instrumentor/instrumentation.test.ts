import { describe, expect, it, vi, beforeEach } from 'vitest'
import { patchFetch } from '../../src/instrumentor/patcher/fetch/fetch'
import { setupInstrumentor } from '../../src/instrumentor/instrumentor'

vi.mock('../../src/instrumentor/patcher/fetch/fetch')

describe('Instrumentor', () => {
  const mockLoad = vi.fn()
  const mockPatchFetch = vi.mocked(patchFetch)
  const mockFingerprintLoader = {
    load: mockLoad,
  }

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

  it('should load FingerprintJS when dom is ready', async () => {
    await setupInstrumentor({
      documentReadyState: () => 'loading',
      fingerprintJs: Promise.resolve(mockFingerprintLoader),
    })

    document.dispatchEvent(new Event('DOMContentLoaded'))

    expect(mockLoad).toHaveBeenCalledTimes(1)
  })

  it('should load FingerprintJS when document ready state is ready', async () => {
    await setupInstrumentor({
      documentReadyState: () => 'interactive',
      fingerprintJs: Promise.resolve(mockFingerprintLoader),
    })

    document.dispatchEvent(new Event('DOMContentLoaded'))

    expect(mockLoad).toHaveBeenCalledTimes(1)
  })

  it('should load FingerprintJS and prepare signals collection', async () => {
    const mockCollect = vi.fn().mockReturnValue('signals')
    mockLoad.mockResolvedValue({ collect: mockCollect })

    await setupInstrumentor({
      documentReadyState: () => 'interactive',
      fingerprintJs: Promise.resolve(mockFingerprintLoader),
    })

    expect(mockLoad).toHaveBeenCalledTimes(1)

    const patcherContext = mockPatchFetch.mock.calls[0][0].ctx
    expect(patcherContext).toBeTruthy()

    expect(await patcherContext.getSignals()).toEqual('signals')
    expect(await patcherContext.getSignals()).toEqual('signals')

    // Assume that the actual signals collection happened only once
    expect(mockCollect).toHaveBeenCalledTimes(1)
  })
})
