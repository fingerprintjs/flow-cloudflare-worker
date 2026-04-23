// Mirrors EdgeHeaders enum from flow worker, as we can't import it directly here
import { getReceivedHeaders } from '../tests/shared/utils'
import { expect, Response } from '@playwright/test'
import { generateKeyPairSync } from 'crypto'
import { getFingerprintBotHeaders } from './fingerprintBot'

export const edgeHeaders = [
  'fp-ip-info-v4-address',
  'fp-ip-info-v6-address',
  'fp-bot-info-category',
  'fp-bot-info-provider',
  'fp-bot-info-name',
  'fp-bot-info-identity',
] as const

export type EdgeHeadersDict = Record<(typeof edgeHeaders)[number], string>

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

export enum BotIdentityVariant {
  Spoofed = 'spoofed',
}

export function getBotSignatureHeaders(url: URL, variant: BotIdentityVariant) {
  switch (variant) {
    case BotIdentityVariant.Spoofed: {
      const { privateKey } = generateKeyPairSync('ed25519', {
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      })

      return getFingerprintBotHeaders(url, privateKey)
    }
  }
}

export function verifyEdgeBotHeaders(headers: EdgeHeadersDict, variant: BotIdentityVariant) {
  expect(headers['fp-bot-info-category']).toBe('ai_agent')
  expect(headers['fp-bot-info-provider']).toBe('Fingerprint')
  expect(headers['fp-bot-info-name']).toBe('Fingerprint Agent')
  expect(headers['fp-bot-info-identity']).toBe(variant)
}
