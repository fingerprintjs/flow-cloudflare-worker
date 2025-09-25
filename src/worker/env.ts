import { Env } from './types'
import { MissingVariableError } from './errors'

const defaults = {
  FPJS_CDN_URL: 'fpcdn.io',
  FPJS_INGRESS_BASE_HOST: 'api.fpjs.io',
  PROTECTION_CONFIG: {
    protectedApis: [],
    identificationPageUrls: [],
  },
} satisfies Partial<Env>

function assertVariableIsSet(env: Env, key: keyof Env) {
  if (!env[key]) {
    throw new MissingVariableError(key)
  }
}

export function getCDNUrl(env: Env) {
  return env.FPJS_CDN_URL || defaults.FPJS_CDN_URL
}

export function getIngressBaseHost(env: Env) {
  return env.FPJS_INGRESS_BASE_HOST || defaults.FPJS_INGRESS_BASE_HOST
}

export function getProtectionConfig(env: Env) {
  return env.PROTECTION_CONFIG || defaults.PROTECTION_CONFIG
}

export function getPublicKey(env: Env) {
  assertVariableIsSet(env, 'PUBLIC_KEY')

  return env.PUBLIC_KEY
}

export function getSecretKey(env: Env) {
  assertVariableIsSet(env, 'SECRET_KEY')

  return env.SECRET_KEY
}

export function getScriptBehaviourPath(env: Env) {
  assertVariableIsSet(env, 'SCRIPTS_BEHAVIOUR_PATH')

  return env.SCRIPTS_BEHAVIOUR_PATH
}
