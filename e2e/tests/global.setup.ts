import { test as setup } from '@playwright/test'
import { getTestDomain } from '../utils/env'

setup('wait for website', async () => {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(getTestDomain())
      if (response.ok) {
        return
      }

      attempts++
    } catch {
      attempts++
    }

    // Wait for 1 second before trying again
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
})
