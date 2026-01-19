import { TestWorkerProjectName } from '../projects/types'

export function getTestDomain() {
  return getEnv('TEST_DOMAIN')
}

/**
 * Constructs and returns the host for a test project by combining a test ID, the provided project name,
 * and the test domain.
 *
 * @param {TestWorkerProjectName} projectName - The name of the test project to include in the base URL.
 * @return {string} The constructed base URL for the given test project.
 *
 * @example
 * ```typescript
 * // process.env.TEST_DOMAIN = 'test-domain'
 * // process.env.TEST_ID = 'test-id'
 *
 * const baseUrl = getTestProjectBaseUrl('scripts')
 * console.log(baseUrl) // Outputs: 'test-id-scripts.test-domain'
 * ```
 */
export function getTestProjectHost(projectName: TestWorkerProjectName): string {
  return `${getTestId()}-${projectName}.${getTestDomain()}`
}

export function getTestHost(name: string) {
  return `${getTestId()}-${name}.${getTestDomain()}`
}

export function getPublicKey() {
  return getEnv('FP_PUBLIC_KEY')
}

export function getSecretKey() {
  return getEnv('FP_SECRET_KEY')
}

export function getRulesetId(projectName?: TestWorkerProjectName) {
  return getProjectEnv('FP_RULESET_ID', projectName)
}

export function getTestId() {
  return getEnv('TEST_ID')
}

export function getCloudflareZoneId() {
  return getEnv('CLOUDFLARE_ZONE_ID')
}

export function getIngressBaseHost() {
  return process.env.FP_INGRESS_BASE_HOST
}

export function getCdnHost() {
  return process.env.FP_CDN_HOST
}

export function getRegion() {
  return process.env.FP_REGION || 'us'
}

export function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

/**
 * Retrieves the value of an environment variable for a specific project.
 * If a project-specific variable is not found, or if no project is provided, it defaults to the general key.
 *
 * @param {string} key - The base key for the environment variable.
 * @param {TestWorkerProjectName | undefined} projectName - The name of the project in context, used to construct the project-specific key.
 * @return {string} - The value of the environment variable associated with the project-specific key or the general key.
 */
export function getProjectEnv(key: string, projectName?: TestWorkerProjectName): string {
  if (!projectName) {
    return getEnv(key)
  }

  const fullKey = `${projectName.toUpperCase().replace(/-/g, '_')}_${key}`

  try {
    return getEnv(fullKey)
  } catch {
    // Fallback to the original key if the project-specific key is not found.
    return getEnv(key)
  }
}
