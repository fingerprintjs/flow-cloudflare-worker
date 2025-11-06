import { test as setup } from '@playwright/test'
import { getTestProjectBaseUrl } from '../utils/env'
import { getTestProjects } from '../utils/projects'

setup('wait for website', async ({}) => {
  for (const project of getTestProjects()) {
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`https://${getTestProjectBaseUrl(project.project)}`)
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
  }
})
