import { TypedEnv } from './types'
import { InvalidVariableError, MissingVariableError } from './errors'
import { isRegion, Region } from './fingerprint/region'
import { RuleActionUnion } from './fingerprint/ruleset'
import { isLogLevel, LogLevel } from '../shared/types'

const defaults = {
  FP_CDN_HOST: 'fpcdn.io',
  FP_INGRESS_BASE_HOST: 'api.fpjs.io',
  PROTECTED_APIS: [],
  IDENTIFICATION_PAGE_URLS: [],
  FP_RULESET_ID: '',
  FP_FAILURE_FALLBACK_ACTION: {
    type: 'block',
    status_code: 403,
    body: '',
    headers: [],
  },
} satisfies Partial<TypedEnv>

function assertVariableIsSet(env: TypedEnv, key: keyof TypedEnv) {
  if (!env[key]) {
    throw new MissingVariableError(key)
  }
}

export function getCDNHost(env: TypedEnv) {
  return env.FP_CDN_HOST || defaults.FP_CDN_HOST
}

export function getIngressBaseHost(env: TypedEnv) {
  return env.FP_INGRESS_BASE_HOST || defaults.FP_INGRESS_BASE_HOST
}
export function getProtectedApis(env: TypedEnv) {
  return env.PROTECTED_APIS ?? defaults.PROTECTED_APIS
}

export function getIdentificationPageUrls(env: TypedEnv) {
  return env.IDENTIFICATION_PAGE_URLS ?? defaults.IDENTIFICATION_PAGE_URLS
}

export function getPublicKey(env: TypedEnv) {
  assertVariableIsSet(env, 'FP_PUBLIC_KEY')

  return env.FP_PUBLIC_KEY
}

export function getSecretKey(env: TypedEnv) {
  assertVariableIsSet(env, 'FP_SECRET_KEY')

  return env.FP_SECRET_KEY
}

export function getRulesetId(env: TypedEnv) {
  return env.FP_RULESET_ID || ''
}

export function getRoutePrefix(env: TypedEnv) {
  assertVariableIsSet(env, 'WORKER_ROUTE_PREFIX')

  if (env.WORKER_ROUTE_PREFIX.startsWith('/')) {
    throw new InvalidVariableError('WORKER_ROUTE_PREFIX', 'must not start with slash')
  }

  return env.WORKER_ROUTE_PREFIX
}

export function getFallbackRuleAction(env: TypedEnv): RuleActionUnion {
  const rule = env.FP_FAILURE_FALLBACK_ACTION
  if (rule) {
    const result = RuleActionUnion.safeParse(rule)

    if (result.success) {
      return result.data
    }

    console.warn(`Invalid rule action provided`, result.error, 'Fallback to block action.')
  }

  return defaults.FP_FAILURE_FALLBACK_ACTION
}

/**
 * Determines if the current environment is in monitor mode.
 * If that's the case, the worker will still perform necessary identification requests, but won't perform any ruleset enforcement.
 */
export function isMonitorMode(env: TypedEnv) {
  return !env.FP_RULESET_ID
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

export function getFpLogLevel(env: TypedEnv): LogLevel {
  const level = env.FP_LOG_LEVEL
  if (level && isLogLevel(level)) {
    return level
  }
  return 'error'
}
