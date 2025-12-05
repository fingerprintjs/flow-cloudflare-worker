import { routePrefix } from '../shared/fingerprint/import'

export const detectionToken = '<DETECTION_TOKEN>'

export const hiddenLinkId = `${routePrefix}-load-more`

export function createHiddenLink() {
  const style = document.createElement('style')
  style.innerText = `
    .${hiddenLinkId} {
      position: absolute;
      left: 1px;
      height: 1px;
      width: 1px;
      opacity: 0.1;
      font-size: 7px;
      user-select: none;
    }
  `
  document.head.appendChild(style)

  const container = document.createElement('div')
  container.className = `${routePrefix}-load-more`
  container.innerHTML = `<a id="${hiddenLinkId}" href="/${routePrefix}/api/load-more?sessionId=${detectionToken}">Load more</a>`
  document.body.appendChild(container)
}

export function storeToken(signals: string) {
  console.info('Storing detection token:', {
    detectionToken,
    signals,
  })

  fetch(`/${routePrefix}/store-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signals,
      token: detectionToken,
    }),
  })
}
