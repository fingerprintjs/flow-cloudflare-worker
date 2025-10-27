import { ProtectedApi } from '../../shared/types'

// This template will be replaced during injection by the worker.
const PROTECTED_APIS_STR: unknown = '<PROTECTED_APIS>'

function isProtectedApis(value: unknown): value is ProtectedApi[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && 'method' in item && 'url' in item)
}

export function getProtectedApis(): ProtectedApi[] {
  try {
    if (typeof PROTECTED_APIS_STR === 'string') {
      console.warn('Protected APIs are not set, instrumentation will not run.')
      return []
    }

    const data = PROTECTED_APIS_STR
    if (!isProtectedApis(data)) {
      console.warn('Protected APIs are not in the correct format, instrumentation will not run.')
      return []
    }

    if (!data?.length) {
      console.warn('No protected APIs found, instrumentation will not run.')
    } else {
      console.debug('Found protected APIs', data)
    }

    return data ?? []
  } catch (error) {
    console.error('Error parsing protected APIs:', error)
    return []
  }
}
