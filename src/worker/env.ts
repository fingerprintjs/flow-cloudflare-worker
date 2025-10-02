import { TypedEnv } from './types'
import { MissingVariableError } from './errors'
import { isRegion, Region } from './fingerprint/region'

const defaults = {
  FPJS_CDN_URL: 'fpcdn.io',
  FPJS_INGRESS_BASE_HOST: 'api.fpjs.io',
  PROTECTED_APIS: [],
  IDENTIFICATION_PAGE_URLS: [],
  FP_RULESET_ID: '',
  MISSING_SIGNALS_RESPONSE: '',
} satisfies Partial<TypedEnv>

function assertVariableIsSet(env: TypedEnv, key: keyof TypedEnv) {
  if (!env[key]) {
    throw new MissingVariableError(key)
  }
}

export function getCDNHost(env: TypedEnv) {
  return env.FPJS_CDN_URL || defaults.FPJS_CDN_URL
}

export function getIngressBaseHost(env: TypedEnv) {
  return env.FPJS_INGRESS_BASE_HOST || defaults.FPJS_INGRESS_BASE_HOST
}
export function getProtectedApis(env: TypedEnv) {
  return env.PROTECTED_APIS ?? defaults.PROTECTED_APIS
}

export function getIdentificationPageUrls(env: TypedEnv) {
  return env.IDENTIFICATION_PAGE_URLS ?? defaults.IDENTIFICATION_PAGE_URLS
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

export function getFpRegion(env: TypedEnv): Region {
  const region = env.FP_REGION
  if (region) {
    if (isRegion(region)) {
      return region
    }

    console.warn(`Invalid region provided: ${region}. Using default region: us`)
  }

  return 'us'
}
