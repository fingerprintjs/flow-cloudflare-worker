import { test as baseTest } from '../playwright'
import { getTestHost } from '../../utils/env'

export const corsTest = baseTest.extend<{
  corsUrl: URL
}>({
  corsUrl: async ({}, use) => {
    const url = new URL(`https://${getTestHost('cors-api')}`)

    await use(url)
  },
})
