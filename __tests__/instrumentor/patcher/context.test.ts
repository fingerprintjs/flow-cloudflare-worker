import { describe, it, vi, expect } from 'vitest'
import { WritablePatcherContext } from '../../../src/instrumentor/patcher/context'

describe('Patcher context', () => {
  describe('Agent data processor', () => {
    it('should be callable only once', () => {
      const context = new WritablePatcherContext([])
      const mockProcessAgentData = vi.fn()
      context.setAgentDataProcessor(mockProcessAgentData)

      context.processAgentData('data')
      context.processAgentData('data')

      expect(mockProcessAgentData).toHaveBeenCalledTimes(1)
      expect(mockProcessAgentData).toHaveBeenCalledWith('data')
    })
  })
})
