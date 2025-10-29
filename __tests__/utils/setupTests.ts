import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  // Ensure consistent package.json version for tests
  vi.mock('../../package.json', async () => ({
    ...(await vi.importActual('../../package.json')),
    version: '0.0.1-test',
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})
