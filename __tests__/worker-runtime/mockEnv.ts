import { TypedEnv } from '../../src/worker/types'

export const mockEnv: TypedEnv = {
  FPJS_CDN_URL: 'fpcdn.io',
  FPJS_INGRESS_BASE_HOST: 'api.fpjs.io',
  PROTECTED_APIS: [
    {
      method: 'POST',
      url: '/api',
    },
  ],
  IDENTIFICATION_PAGE_URLS: [],
  PUBLIC_KEY: 'public_key',
  SECRET_KEY: 'secret_key',
  SCRIPTS_BEHAVIOR_PATH: 'scripts',
  FP_RULESET_ID: '',
  FP_REGION: 'us',
}
