export function fetchOrigin(request: Request) {
  const origin = import.meta.env.VITE_ORIGIN

  if (origin) {
    const originUrl = new URL(origin)
    const requestUrl = new URL(request.url)

    originUrl.pathname = requestUrl.pathname
    originUrl.search = requestUrl.search
    const headers = new Headers(request.headers)
    headers.set('Host', originUrl.host)

    console.log(`Using local override: ${originUrl}`)
    return fetch(originUrl, {
      //duplex: 'half', // The CF types don't support duplex right now but wrangler needs it locally
      headers,
      method: request.method,
      body: request.body,
    })
  }

  return fetch(request)
}
