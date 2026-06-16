import { getReceivedHeaders } from '../tests/shared/utils'
import { expect, Response } from '@playwright/test'

// Mirrors EdgeHeaders enum from flow worker, as we can't import it directly here
export const ipV4EdgeHeaders = [
  'fp-ip-info-v4-address',
  'fp-ip-info-v4-geolocation-accuracy-radius',
  'fp-ip-info-v4-geolocation-latitude',
  'fp-ip-info-v4-geolocation-longitude',
  'fp-ip-info-v4-geolocation-postal-code',
  'fp-ip-info-v4-geolocation-timezone',
  'fp-ip-info-v4-geolocation-city-name',
  'fp-ip-info-v4-geolocation-country-code',
  'fp-ip-info-v4-geolocation-continent-code',
  'fp-ip-info-v4-asn-name',
  'fp-ip-info-v4-asn-network',
  'fp-ip-info-v4-asn-type',
  'fp-ip-info-v4-datacenter-name',
] as const

export const ipV6EdgeHeaders = [
  'fp-ip-info-v6-address',
  'fp-ip-info-v6-geolocation-accuracy-radius',
  'fp-ip-info-v6-geolocation-latitude',
  'fp-ip-info-v6-geolocation-longitude',
  'fp-ip-info-v6-geolocation-postal-code',
  'fp-ip-info-v6-geolocation-timezone',
  'fp-ip-info-v6-geolocation-city-name',
  'fp-ip-info-v6-geolocation-country-code',
  'fp-ip-info-v6-geolocation-continent-code',
  'fp-ip-info-v6-asn-name',
  'fp-ip-info-v6-asn-network',
  'fp-ip-info-v6-asn-type',
  'fp-ip-info-v6-datacenter-name',
] as const

export const edgeHeaders = [
  ...ipV4EdgeHeaders,
  ...ipV6EdgeHeaders,
  'fp-bot-info-category',
  'fp-bot-info-provider',
  'fp-bot-info-name',
  'fp-bot-info-identity',
  'fp-proxy',
  'fp-proxy-confidence',
  'fp-proxy-details-proxy-type',
  'fp-proxy-details-last-seen-at',
  'fp-proxy-details-provider',
  'fp-vpn',
  'fp-vpn-confidence',
  'fp-vpn-methods-timezone-mismatch',
  'fp-vpn-methods-public-vpn',
  'fp-vpn-methods-auxiliary-mobile',
  'fp-vpn-methods-os-mismatch',
  'fp-vpn-methods-relay',
  'fp-ip-blocklist-tor-node',
] as const

export type EdgeHeader = (typeof edgeHeaders)[number]

export type EdgeHeadersDict = Record<EdgeHeader, string>

export function isEdgeHeader(header: string): header is EdgeHeader {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return edgeHeaders.includes(header as EdgeHeader)
}

export function checkIpHeaders(response: Response) {
  const headers = getReceivedHeaders(response)

  let headersToCheck: string[]

  if (headers.has('fp-ip-info-v4-address')) {
    headersToCheck = [...ipV4EdgeHeaders]
  } else {
    headersToCheck = [...ipV6EdgeHeaders]
  }

  const existingHeaders = Array.from(headers.keys()).filter((header) => headersToCheck.includes(header))

  expect(existingHeaders.length).toBeGreaterThan(0)
}

export function checkEdgeNoBotHeaders(response: Response) {
  const botHeaderKeys: EdgeHeader[] = [
    'fp-bot-info-category',
    'fp-bot-info-provider',
    'fp-bot-info-name',
    'fp-bot-info-identity',
  ]

  const receivedHeaders = getReceivedHeaders(response)
  for (const botHeaderKey of botHeaderKeys) {
    expect(receivedHeaders.has(botHeaderKey)).toBeFalsy()
  }

  // At least one ip header should be present
  const ipHeaders = [receivedHeaders.get('fp-ip-info-v4-address'), receivedHeaders.get('fp-ip-info-v6-address')].filter(
    Boolean
  )

  expect(ipHeaders.length).toBeGreaterThan(0)

  for (const ipHeader of ipHeaders) {
    expect(ipHeader).toBeTruthy()
  }
}
