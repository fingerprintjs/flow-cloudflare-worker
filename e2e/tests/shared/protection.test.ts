import { expect } from '@playwright/test'
import { getProtectedPath } from '../../utils/config'
import { SIGNALS_KEY } from '../../../src/shared/const'
import { test } from '../playwright'

test.describe('Protection', () => {
  test('should inject signals when protected page is requested', async ({ page, project }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const protectedPath = getProtectedPath('/test', project.projectName)
    await page.evaluate(async (url) => {
      await fetch(url, { method: 'POST' })
    }, protectedPath)

    const protectedRequest = await page
      .requests()
      .then((requests) => requests.find((request) => request.url().includes(protectedPath)))
    expect(protectedRequest).toBeDefined()
    expect(protectedRequest!.headers()[SIGNALS_KEY]).toBeTruthy()
  })
})
