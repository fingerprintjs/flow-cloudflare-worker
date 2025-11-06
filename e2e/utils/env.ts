import { TestWorkerProject } from './types'

export function getTestDomain() {
  return getEnv('TEST_DOMAIN')
}

/**
 * Constructs and returns the base URL for a test project by combining a test ID, the provided project name,
 * and the test domain.
 *
 * @param {TestWorkerProject} project - The name of the test project to include in the base URL.
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
export function getTestProjectBaseUrl(project: TestWorkerProject): string {
  return `${getTestId()}-${project}.${getTestDomain()}`
}

export function isDeleteOnly() {
  return process.env.DELETE_ONLY === 'true'
}

export function getPublicKey() {
  return getEnv('FP_PUBLIC_KEY')
}

export function getSecretKey() {
  return getEnv('FP_SECRET_KEY')
}

export function getRulesetId(project?: TestWorkerProject) {
  return getProjectEnv('FP_RULESET_ID', project)
}

export function getCloudflareToken() {
  return getEnv('CLOUDFLARE_TOKEN')
}

export function getCloudflareAccountId() {
  return getEnv('CLOUDFLARE_ACCOUNT_ID')
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
  return process.env.FP_CDN_URL
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
 * @param {TestWorkerProject | undefined} project - The name of the project in context, used to construct the project-specific key.
 * @return {string} - The value of the environment variable associated with the project-specific key or the general key.
 */
export function getProjectEnv(key: string, project?: TestWorkerProject) {
  if (!project) {
    return getEnv(key)
  }

  const fullKey = `${project.toUpperCase()}_${key}`

  try {
    return getEnv(fullKey)
  } catch {
    // Fallback to the original key if the project-specific key is not found.
    return getEnv(key)
  }
}
