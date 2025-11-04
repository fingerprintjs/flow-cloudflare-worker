import { version } from '../../package.json'

const searchParam = 'ii'

export type IntegrationInfoType = 'procdn' | 'instrumentor'

export function getIntegrationInfo(type: IntegrationInfoType) {
  return `fingerprint-flow-cloudflare/${version}/${type}`
}

export function addIntegrationInfo(url: URL, type: IntegrationInfoType) {
  url.searchParams.append(searchParam, getIntegrationInfo(type))
}
