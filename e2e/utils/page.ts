import { getTestDomain } from './env'

export function getTestPageUrl(path: string) {
  const url = new URL(getTestDomain())
  url.pathname = path
  return url.toString()
}
