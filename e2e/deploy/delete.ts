import { config } from 'dotenv'
import { getTestProjects } from '../projects/projects'

config({
  path: ['.env', '.env.local'],
  quiet: true,
})

/**
 * Deletes all deployments associated with test projects.
 *
 * This method iterates through all test projects obtained from the
 * `getTestProjects()` function and deletes each project asynchronously.
 *
 * @return {Promise<void>} A promise that resolves when all deployments have been deleted.
 */
async function deleteDeployments(): Promise<void> {
  const projects = getTestProjects()
  let hasError = false

  for (const project of projects) {
    try {
      await project.delete()
    } catch (error) {
      console.error(`Failed to delete deployment for ${project.projectName}:`, error)
      hasError = true
    }
  }

  if (hasError) {
    throw new Error('One or more deployments failed to delete. Please check the logs for more details.')
  }
}

deleteDeployments().catch((error) => {
  console.error(error)
  process.exit(1)
})
