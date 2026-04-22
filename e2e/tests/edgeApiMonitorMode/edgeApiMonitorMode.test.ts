import { test } from '../playwright'
import { assertIsDefined, getReceivedHeaders } from '../shared/utils'
import { getProtectedPath } from '../../utils/config'
import { checkEdgeHeaders, edgeHeaders } from '../../utils/edge'
import { SIGNALS_KEY } from '../../../src/shared/const'
import { expect } from '@playwright/test'

test.describe('Edge API in monitor mode', () => {
  test.describe('Instrumentation page', () => {
    test('should return response with Edge headers', async ({ page }) => {
      const response = await page.goto('/')
      assertIsDefined(response)

      checkEdgeHeaders(response)
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

      checkEdgeHeaders(protectedResponse)
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
        expect(receivedHeaders.get(edgeHeader)).toEqual('')
      }
    })
  })
})
