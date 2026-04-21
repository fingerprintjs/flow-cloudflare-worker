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
]

export function checkEdgeHeaders(response: Response) {
  const receivedHeaders = getReceivedHeaders(response)
  for (const edgeHeadersKey of edgeHeaders) {
    expect(receivedHeaders.get(edgeHeadersKey)).toBeDefined()
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
