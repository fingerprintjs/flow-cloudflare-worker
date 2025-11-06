import { config } from 'dotenv'
import { getTestProjects } from '../projects/projects'

config({
  path: ['.env', '.env.local'],
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

  for (const project of projects) {
    await project.delete()
  }
}

deleteDeployments().catch((error) => {
  console.error(error)
  process.exit(1)
})
