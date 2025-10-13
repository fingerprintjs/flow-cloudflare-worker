import { TypedEnv } from '../../src/worker/types'

/**
 * A constant string representing the base URL for the mock worker service.
 * This URL is used to route requests to the mock server
 * for testing purposes.
 */
export const mockWorkerBaseUrl = 'https://example.com'

/**
 * Constructs a full mock URL by combining the provided path with a predefined base URL.
 *
 * @param {string} path - The path to be appended to the base URL.
 * @return {string} The full mock URL as a string.
 */
export function mockUrl(path: string): string {
  const url = new URL(path, mockWorkerBaseUrl)
  return url.toString()
}

export const mockEnv: TypedEnv = {
  FPJS_CDN_URL: 'fpcdn.io',
  FPJS_INGRESS_BASE_HOST: 'api.fpjs.io',
  PROTECTED_APIS: [
    {
      method: 'POST',
      url: mockUrl('/api/*'),
    },
  ],
  FP_FAILURE_FALLBACK_ACTION: {
    type: 'block',
    status_code: 403,
    body: 'fallback block',
    headers: [],
  },
  IDENTIFICATION_PAGE_URLS: [mockWorkerBaseUrl],
  PUBLIC_KEY: 'public_key',
  SECRET_KEY: 'secret_key',
  WORKER_ROUTE_PREFIX: 'scripts',
  FP_RULESET_ID: '',
  FP_REGION: 'us',
}
