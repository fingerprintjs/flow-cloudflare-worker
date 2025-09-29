import { ProtectedApi } from '../shared/types'

export type TypedEnv = Omit<Env, 'ASSETS'> & {
  PROTECTION_CONFIG: ProtectionConfig
}

export type EnvWithAssets = TypedEnv & Pick<Env, 'ASSETS'>

export type ProtectionConfig = {
  protectedApis: ProtectedApi[]
  identificationPageUrls: string[]
}
