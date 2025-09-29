export type TypedEnv = Omit<Env, 'ASSETS'> & {
  PROTECTION_CONFIG: ProtectionConfig
}

export type EnvWithAssets = TypedEnv & Pick<Env, 'ASSETS'>

export type ProtectedApi = {
  method: 'POST' // Only POST is supported for now
  url: string
}

export type ProtectionConfig = {
  protectedApis: ProtectedApi[]
  identificationPageUrls: string[]
}
