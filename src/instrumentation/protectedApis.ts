import { PROTECTED_APIS_WINDOW_KEY } from '../shared/const'
import { ProtectedApi } from '../shared/types'

export function getProtectedApis(): ProtectedApi[] {
  const data = window[PROTECTED_APIS_WINDOW_KEY]

  if (!data?.length) {
    console.warn('No protected APIs found, instrumentation will not run.')
  }

  return data ?? []
}
