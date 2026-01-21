import { deepStrictEqual } from 'assert'
import { afterEach, vi, expect } from 'vitest'

vi.mock('../../package.json', async () => ({
  ...(await vi.importActual('../../package.json')),
  version: '0.0.1-test',
}))

afterEach(() => {
  vi.clearAllMocks()
})

function areRequestsEqual(a: unknown, b: unknown): boolean | undefined {
  const isARequest = a instanceof Request
  const isBRequest = b instanceof Request

  if (isARequest && isBRequest) {
    try {
      deepStrictEqual(a, b)
      return true
    } catch (e) {
      return false
    }
  } else if (!isARequest && !isBRequest) {
    return undefined
  } else {
    return false
  }
}

expect.addEqualityTesters([areRequestsEqual])
