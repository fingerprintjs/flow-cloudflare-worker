import { test } from '../playwright'
import { assertIsDefined, getReceivedHeaders } from '../shared/utils'
import { getProtectedPath } from '../../utils/config'
import { checkEdgeBotHeaders, checkEdgeNoBotHeaders, edgeHeaders, EdgeHeadersDict } from '../../utils/edge'
import { SIGNALS_KEY } from '../../../src/shared/const'
import { expect } from '@playwright/test'
import { AiAgentAPI, MalformedModes, NoScriptRequest } from '../../utils/aiAgentApi'

test.describe('Edge API in monitor mode', () => {
  test.describe('Instrumentation page', () => {
    test('should return response with Edge headers', async ({ page }) => {
      const response = await page.goto('/')
      assertIsDefined(response)

      checkEdgeNoBotHeaders(response)
    })

    test('should prevent spoofing of Edge headers', async ({ page }) => {
      await page.route('/', (route, request) => {
        const headers = {
          ...request.headers(),
          'fp-bot-info-category': 'ai_agent',
          'fp-bot-info-name': 'Fingerprint Agent',
          'fp-bot-info-identity': 'verified',
          'fp-bot-info-provider': 'Fingerprint',
          'fp-ip-info-v4-address': '1.2.3.4',
          'fp-ip-info-v6-address': '::1',
        }
        route.continue({ headers })
      })

      const response = await page.goto('/')
      assertIsDefined(response)

      checkEdgeNoBotHeaders(response)

      const receivedHeaders = getReceivedHeaders(response)
      const ipv4AddressValue = receivedHeaders.get('fp-ip-info-v4-address')
      if (ipv4AddressValue) {
        expect(ipv4AddressValue).not.toEqual('1.2.3.4')
      }
      const ipv6AddressValue = receivedHeaders.get('fp-ip-info-v6-address')
      if (ipv6AddressValue) {
        expect(ipv6AddressValue).not.toEqual('::1')
      }
    })
  })

  test.describe('Protected API', () => {
    test('should return response with Edge headers', async ({ page, project }) => {
      await page.goto('/', { waitUntil: 'networkidle' })

      const protectedPath = getProtectedPath('/test', project.projectName)

      // Trigger the fetch
      await page.evaluate(async (url) => {
        try {
          await fetch(url, { method: 'POST' })
        } catch (error) {
          // Ignore fetch errors - the request may still be recorded
        }
      }, protectedPath)

      const protectedRequest = await page
        .requests()
        .then((requests) => requests.find((request) => request.url().includes(protectedPath)))
      assertIsDefined(protectedRequest)

      const protectedResponse = await protectedRequest.response()
      assertIsDefined(protectedResponse)

      // Playwright will be identified as a browser automation bot
      checkEdgeBotHeaders(protectedResponse)
    })

    test('should return empty Edge headers when agent data is missing', async ({ page, project }) => {
      await page.goto('/', { waitUntil: 'networkidle' })

      const protectedPath = getProtectedPath('/test', project.projectName)

      await page.route(protectedPath, (route, request) => {
        const headers = {
          ...request.headers(),
        }
        // Delete signals from the request to protected page
        delete headers[SIGNALS_KEY]

        route.continue({ headers })
      })

      await page.evaluate(async (url) => {
        await fetch(url, { method: 'POST' })
      }, protectedPath)

      const requests = await page.requests()
      const protectedRequest = requests.find((request) => request.url().includes(protectedPath))
      assertIsDefined(protectedRequest)

      const protectedResponse = await protectedRequest.response()
      assertIsDefined(protectedResponse)
      expect(protectedResponse.status()).toEqual(200)

      const receivedHeaders = getReceivedHeaders(protectedResponse)
      for (const edgeHeader of edgeHeaders) {
        expect(receivedHeaders.has(edgeHeader)).toBeFalsy()
      }
    })

    test('should prevent spoofing of Edge headers', async ({ page, project }) => {
      await page.goto('/', { waitUntil: 'networkidle' })

      const spoofedHeaders: Record<string, string> = {
        'fp-bot-info-category': 'ai_agent',
        'fp-bot-info-name': 'Fingerprint Agent',
        'fp-bot-info-identity': 'verified',
        'fp-bot-info-provider': 'Fingerprint',
        'fp-ip-info-v4-address': '1.2.3.4',
        'fp-ip-info-v6-address': '::1',
      }

      await page.route('/test', (route, request) => {
        const headers = {
          ...request.headers(),
          ...spoofedHeaders,
        }
        route.continue({ headers })
      })

      const protectedPath = getProtectedPath('/test', project.projectName)

      // Trigger the fetch
      await page.evaluate(async (url) => {
        try {
          await fetch(url, { method: 'POST' })
        } catch (error) {
          // Ignore fetch errors - the request may still be recorded
        }
      }, protectedPath)

      const protectedRequest = await page
        .requests()
        .then((requests) => requests.find((request) => request.url().includes(protectedPath)))
      assertIsDefined(protectedRequest)

      const protectedResponse = await protectedRequest.response()
      assertIsDefined(protectedResponse)

      const receivedHeaders = getReceivedHeaders(protectedResponse)

      for (const [name, spoofedValue] of Object.entries(spoofedHeaders)) {
        const actualValue = receivedHeaders.get(name)
        if (actualValue) {
          expect(actualValue).not.toEqual(spoofedValue)
        }
      }
    })
  })

  test.describe('Bot Detection', () => {
    type TestCase = {
      name: string
      noScriptRequest: Pick<NoScriptRequest, 'malformedModes' | 'spoofOriginUrl'>
      expectedEdgeHeaders: Pick<
        EdgeHeadersDict,
        'fp-bot-info-category' | 'fp-bot-info-name' | 'fp-bot-info-identity' | 'fp-bot-info-provider'
      >
      // Set to true to run only this test case, useful for debugging
      only?: boolean
    }

    const testCases: TestCase[] = [
      {
        name: 'verified bot',
        noScriptRequest: {},
        expectedEdgeHeaders: {
          'fp-bot-info-category': 'ai_agent',
          'fp-bot-info-name': 'Fingerprint Agent',
          'fp-bot-info-identity': 'verified',
          'fp-bot-info-provider': 'Fingerprint',
        },
      },

      {
        name: 'spoofed bot',
        noScriptRequest: {
          spoofOriginUrl: 'https://fingerprint.com',
        },
        expectedEdgeHeaders: {
          'fp-bot-info-category': 'ai_agent',
          'fp-bot-info-name': 'Fingerprint Agent',
          'fp-bot-info-identity': 'spoofed',
          'fp-bot-info-provider': 'Fingerprint',
        },
      },

      {
        name: 'malformed bot - expired signature',
        noScriptRequest: {
          malformedModes: [MalformedModes.ExpiredSignature],
        },
        expectedEdgeHeaders: {
          'fp-bot-info-category': 'ai_agent',
          'fp-bot-info-name': 'Fingerprint Agent',
          'fp-bot-info-identity': 'unknown',
          'fp-bot-info-provider': 'Fingerprint',
        },
      },

      {
        name: 'malformed bot - missing signature agent',
        noScriptRequest: {
          malformedModes: [MalformedModes.MissingSignatureAgent],
        },
        expectedEdgeHeaders: {
          'fp-bot-info-category': 'ai_agent',
          'fp-bot-info-name': 'Fingerprint Agent',
          'fp-bot-info-identity': 'unknown',
          'fp-bot-info-provider': 'Fingerprint',
        },
      },

      {
        name: 'malformed bot - missing authority',
        noScriptRequest: {
          malformedModes: [MalformedModes.MissingAuthority],
        },
        expectedEdgeHeaders: {
          'fp-bot-info-category': 'ai_agent',
          'fp-bot-info-name': 'Fingerprint Agent',
          'fp-bot-info-identity': 'unknown',
          'fp-bot-info-provider': 'Fingerprint',
        },
      },

      {
        name: 'malformed bot - invalid expires',
        noScriptRequest: {
          malformedModes: [MalformedModes.NotValidExpires],
        },
        expectedEdgeHeaders: {
          'fp-bot-info-category': 'ai_agent',
          'fp-bot-info-name': 'Fingerprint Agent',
          'fp-bot-info-identity': 'unknown',
          'fp-bot-info-provider': 'Fingerprint',
        },
      },

      {
        name: 'malformed bot - invalid created',
        noScriptRequest: {
          malformedModes: [MalformedModes.NotValidCreated],
        },
        expectedEdgeHeaders: {
          'fp-bot-info-category': 'ai_agent',
          'fp-bot-info-name': 'Fingerprint Agent',
          'fp-bot-info-identity': 'unknown',
          'fp-bot-info-provider': 'Fingerprint',
        },
      },
    ]

    for (const testCase of testCases) {
      const t = testCase.only ? test.only : test

      t(testCase.name, async ({ baseURL }) => {
        const edgeHeaders = await AiAgentAPI.noScript({
          url: baseURL!,
          ...testCase.noScriptRequest,
        })

        expect(edgeHeaders).toEqual(expect.objectContaining(testCase.expectedEdgeHeaders))
      })
    }
  })
})
