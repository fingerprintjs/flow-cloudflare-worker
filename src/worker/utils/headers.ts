import { HeaderMissingError } from '../errors'

export function hasContentType(headers: Headers, ...expectedContentTypes: string[]) {
  const contentType = headers.get('Content-Type')?.toLowerCase()

  if (contentType) {
    return expectedContentTypes.some((expectedContentType) => contentType.startsWith(expectedContentType))
  }

  return false
}

export function getHeaderOrThrow(headers: Headers, name: string) {
  const value = headers.get(name)
  if (!value) {
    throw new HeaderMissingError(name)
  }
  return value
}

let localIp: string | undefined
export async function getIp(headers: Headers): Promise<string> {
  const ip = headers.get('cf-connecting-ip')

  if (ip) {
    return ip
  }

  if (import.meta.env.MODE == 'dev') {
    console.debug('Fetching local IP for dev mode')
    if (localIp === undefined) {
      const ipResponse = await fetch('https://checkip.amazonaws.com/')
      const ip = await ipResponse.text()
      localIp = ip.trim()
    }
    return localIp
  }

  throw new HeaderMissingError('cf-connecting-ip')
}
