export type TypedEnv = Env & {
  PROTECTION_CONFIG: ProtectionConfig
}

export type EnvWithAssets = TypedEnv & {
  ASSETS: Fetcher
}

export type ProtectedApi = {
  method: 'POST' // Only POST is supported for now
  url: string
}

export type ProtectionConfig = {
  protectedApis: ProtectedApi[]
  identificationPageUrls: string[]
}
