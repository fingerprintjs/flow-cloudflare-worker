import { ConsoleMessage, Page } from '@playwright/test'

import { getTestDomain } from './env'

export function getTestPageUrl(path: string) {
  const url = new URL(getTestDomain())
  url.pathname = path
  return url.toString()
}

/**
 * Listen for console messages that are logged by the instrumentor script
 *
 * @param listener the callback to invoke with every instrumentor console message. Can by sync or async.
 */
export function onInstrumentorConsoleMessages(page: Page, listener: (msg: ConsoleMessage) => any) {
  page.on('console', async (msg) => {
    const rawMessageUrl = msg.location().url
    if (rawMessageUrl) {
      const sourceUrl = new URL(rawMessageUrl)
      if (sourceUrl.pathname.endsWith('/instrumentor.iife.js')) {
        await listener(msg)
      }
    }
  })
}
