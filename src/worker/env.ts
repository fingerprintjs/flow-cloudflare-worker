import { TypedEnv } from './types'
import { MissingVariableError } from './errors'

const defaults = {
  FPJS_CDN_URL: 'fpcdn.io',
  FPJS_INGRESS_BASE_HOST: 'api.fpjs.io',
  PROTECTION_CONFIG: {
    protectedApis: [],
    identificationPageUrls: [],
  },
  FP_RULESET_ID: '',
} satisfies Partial<TypedEnv>

function assertVariableIsSet(env: TypedEnv, key: keyof TypedEnv) {
  if (!env[key]) {
    throw new MissingVariableError(key)
  }
}

export function getCDNUrl(env: TypedEnv) {
  return env.FPJS_CDN_URL || defaults.FPJS_CDN_URL
}

export function getIngressBaseHost(env: TypedEnv) {
  return env.FPJS_INGRESS_BASE_HOST || defaults.FPJS_INGRESS_BASE_HOST
}

export function getProtectionConfig(env: TypedEnv) {
  return env.PROTECTION_CONFIG || defaults.PROTECTION_CONFIG
}

export function getPublicKey(env: TypedEnv) {
  assertVariableIsSet(env, 'PUBLIC_KEY')

  return env.PUBLIC_KEY
}

export function getSecretKey(env: TypedEnv) {
  assertVariableIsSet(env, 'SECRET_KEY')

  return env.SECRET_KEY
}

export function getRulesetId(env: TypedEnv) {
  return env.FP_RULESET_ID || ''
}

export function getScriptBehaviorPath(env: TypedEnv) {
  assertVariableIsSet(env, 'SCRIPTS_BEHAVIOR_PATH')

  return env.SCRIPTS_BEHAVIOR_PATH
}
