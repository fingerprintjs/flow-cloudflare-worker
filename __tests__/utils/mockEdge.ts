import { EdgeResponse } from '../../src/worker/fingerprint/identificationClientTypes'

export const mockEdgeResponseIpV4: EdgeResponse = {
  bot_info: {
    category: 'ai_agent',
    provider: 'Fingerprint',
    provider_url: 'https://fingerprint.com',
    name: 'Fingerprint Agent',
    identity: 'signed',
    confidence: 'high',
  },
  ip_info: {
    v4: {
      address: '94.142.239.124',
    },
    v6: undefined,
  },
}

export const mockEdgeResponseIpV6: EdgeResponse = {
  bot_info: {
    category: 'ai_agent',
    provider: 'Fingerprint',
    provider_url: 'https://fingerprint.com',
    name: 'Fingerprint Agent',
    identity: 'signed',
    confidence: 'high',
  },
  ip_info: {
    v4: undefined,
    v6: {
      address: '2001:db8:3333:4444:5555:6666:7777:8888',
    },
  },
}
