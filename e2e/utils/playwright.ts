import { test as baseTest } from '../tests/playwright'
import { getTestHost } from './env'

function createCorsTest(corsHost: string) {
  return baseTest.extend<{
    corsUrl: URL
  }>({
    corsUrl: async ({}, use) => {
      const url = new URL(`https://${getTestHost(corsHost)}`)

      await use(url)
    },
  })
}

export const corsTest = createCorsTest('cors-api')

export const corsBlockTest = createCorsTest('cors-block-api')
