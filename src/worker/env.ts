import { Env } from './types'

const defaults: Env = {
  FPJS_CDN_URL: 'fpcdn.io',
  FPJS_INGRESS_BASE_HOST: 'api.fpjs.io',
  PUBLIC_KEY: '',
  SCRIPTS_BEHAVIOUR_PATH: '',
  PROTECTION_CONFIG: {
    protectedApis: [],
    identificationPageUrls: [],
  },
  SECRET_KEY: '',
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
  return env.PUBLIC_KEY || defaults.PUBLIC_KEY
}

export function getSecretKey(env: Env) {
  return env.SECRET_KEY || defaults.SECRET_KEY
}

export function getScriptBehaviourPath(env: Env) {
  return env.SCRIPTS_BEHAVIOUR_PATH || defaults.SCRIPTS_BEHAVIOUR_PATH
}
