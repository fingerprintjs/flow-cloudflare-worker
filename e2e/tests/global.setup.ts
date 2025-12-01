import { test as setup } from '@playwright/test'
import { getTestProjects } from '../projects/projects'

setup('wait for website', async () => {
  for (const project of getTestProjects()) {
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(project.baseUrl)
        if (response.ok) {
          break
        }

        attempts++
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed for ${project.displayName}:`, error)
        attempts++
      }

      // Wait for 1 second before trying again
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    if (attempts >= maxAttempts) {
      throw new Error(`Failed to load ${project.baseUrl} after ${maxAttempts} attempts`)
    }
  }
})
