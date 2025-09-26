import { ProtectedApi } from '../shared/types'

export type Env = {
  FPJS_CDN_URL: string
  FPJS_INGRESS_BASE_HOST: string
  PUBLIC_KEY: string
  PROTECTION_CONFIG: ProtectionConfig

  // Random prefix for script paths
  SCRIPTS_BEHAVIOUR_PATH: string

  SECRET_KEY: string
}

export type EnvWithAssets = Env & {
  ASSETS: Fetcher
}

export type ProtectionConfig = {
  protectedApis: ProtectedApi[]
  identificationPageUrls: string[]
}
