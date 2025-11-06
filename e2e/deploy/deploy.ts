import { config } from 'dotenv'
import { getTestProjects } from '../projects/projects'

config({
  path: ['.env', '.env.local'],
})

/**
 * Deploys a collection of test projects sequentially.
 * This function retrieves all test projects and iterates through them to call their individual `deploy` method.
 *
 * @return {Promise<void>} A promise that resolves when all projects have been deployed.
 */
async function deploy(): Promise<void> {
  const projects = getTestProjects()

  for (const project of projects) {
    await project.deploy()
  }
}

deploy().catch((error) => {
  console.error(error)
  process.exit(1)
})
