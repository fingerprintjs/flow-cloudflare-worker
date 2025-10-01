import { ProtectedApi } from '../shared/types'

// This template will be replaced during injection by the worker.
const PROTECTED_APIS_STR: any = '<PROTECTED_APIS>'

export function getProtectedApis(): ProtectedApi[] {
  try {
    const data = PROTECTED_APIS_STR as ProtectedApi[]

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
