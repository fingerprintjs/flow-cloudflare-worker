// Mirrors EdgeHeaders enum from flow worker, as we can't import it directly here
import { getReceivedHeaders } from '../tests/shared/utils'
import { expect, Response } from '@playwright/test'

export const edgeHeaders = [
  'fp-ip-info-v4-address',
  'fp-ip-info-v6-address',
  'fp-bot-info-category',
  'fp-bot-info-provider',
  'fp-bot-info-name',
  'fp-bot-info-identity',
] as const

export type EdgeHeader = (typeof edgeHeaders)[number]

export type EdgeHeadersDict = Record<EdgeHeader, string>

export function isEdgeHeader(header: string): header is EdgeHeader {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return edgeHeaders.includes(header as EdgeHeader)
}

export function checkEdgeHeaders(response: Response) {
  const fpHeaders: EdgeHeadersDict = {
    'fp-ip-info-v4-address': '',
    'fp-ip-info-v6-address': '',
    'fp-bot-info-category': '',
    'fp-bot-info-provider': '',
    'fp-bot-info-name': '',
    'fp-bot-info-identity': '',
  }

  const receivedHeaders = getReceivedHeaders(response)
  for (const edgeHeadersKey of edgeHeaders) {
    expect(receivedHeaders.get(edgeHeadersKey)).toBeDefined()
    fpHeaders[edgeHeadersKey] = receivedHeaders.get(edgeHeadersKey)!
  }
  // At least one ip header should be present
  const ipHeaders = [receivedHeaders.get('fp-ip-info-v4-address'), receivedHeaders.get('fp-ip-info-v6-address')].filter(
    Boolean
  )

  expect(ipHeaders.length).toBeGreaterThan(0)

  for (const ipHeader of ipHeaders) {
    expect(ipHeader).toBeTruthy()
  }

  return fpHeaders
}
