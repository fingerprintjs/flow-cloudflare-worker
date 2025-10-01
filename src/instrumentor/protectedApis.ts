import { ProtectedApi } from '../shared/types'
import { PROTECTED_APIS_TEMPLATE } from '../shared/const'

// This template will be replaced during injection by the worker.
const PROTECTED_APIS = PROTECTED_APIS_TEMPLATE

export function getProtectedApis(): ProtectedApi[] {
  if (PROTECTED_APIS === PROTECTED_APIS_TEMPLATE) {
    console.warn('List of protected APIs was not injected correctly, check your worker configuration.')
  }

  const data = PROTECTED_APIS as unknown as ProtectedApi[]

  if (!data?.length) {
    console.warn('No protected APIs found, instrumentation will not run.')
  }

  return data ?? []
}
