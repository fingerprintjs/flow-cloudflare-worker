import { describe, it, expect } from 'vitest'
import { getRoutePrefix } from '../../src/worker/env'
import { mockEnv } from '../utils/mockEnv'

describe('env', () => {
  it('throws an error for an invalid WORKER_ROUTE_PREFIX', () => {
    expect(() => {
      getRoutePrefix({
        ...mockEnv,
        WORKER_ROUTE_PREFIX: '/example',
      })
    }).toThrowError(/must not start with slash/)
  })
})
