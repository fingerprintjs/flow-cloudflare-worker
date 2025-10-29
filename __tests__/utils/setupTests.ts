import { afterEach, vi } from 'vitest'

vi.mock('../../package.json', async () => ({
  ...(await vi.importActual('../../package.json')),
  version: '0.0.1-test',
}))

afterEach(() => {
  vi.clearAllMocks()
})
