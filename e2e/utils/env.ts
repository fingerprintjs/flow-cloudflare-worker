export function getTestDomain() {
  return getEnv('TEST_DOMAIN')
}

export function isDeleteOnly() {
  return process.env.DELETE_ONLY === 'true'
}

export function getPublicKey() {
  return getEnv('FP_PUBLIC_KEY')
}

export function getSecretKey() {
  return getEnv('FP_SECRET_KEY')
}

export function getRulesetId() {
  return getEnv('FP_RULESET_ID')
}

export function getCloudflareToken() {
  return getEnv('CLOUDFLARE_TOKEN')
}

export function getCloudflareAccountId() {
  return getEnv('CLOUDFLARE_ACCOUNT_ID')
}

export function getCloudflareZoneId() {
  return getEnv('CLOUDFLARE_ZONE_ID')
}

export function getIngressBaseHost() {
  return process.env.FP_INGRESS_BASE_HOST
}

export function getCdnHost() {
  return process.env.FP_CDN_URL
}

export function getRegion() {
  return process.env.FP_REGION || 'us'
}

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}
