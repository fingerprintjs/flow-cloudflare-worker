import { expect } from '@playwright/test'
import { test } from '../playwright'
import { assertIsDefined } from '../shared/utils'
import { getProtectedPath } from '../../utils/config'

const edgeHeaders = [
  'fp-info-v4-address',
  'fp-info-v6-address',
  'fp-bot-info-category',
  'fp-bot-info-provider',
  'fp-bot-info-name',
  'fp-bot-info-identity',
]

test.describe('Edge API in monitor mode', () => {
  test('should return response with Edge headers for instrumentation page', async ({ page }) => {
    const response = await page.goto('/')
    assertIsDefined(response)

    for (const edgeHeadersKey of edgeHeaders) {
      expect(response.headers()[edgeHeadersKey]).toBeDefined()
    }
  })

  test('should return response with Edge headers for protected API', async ({ page, project }) => {
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

    for (const edgeHeadersKey of edgeHeaders) {
      expect(protectedResponse.headers()[edgeHeadersKey]).toBeDefined()
    }
  })
})
