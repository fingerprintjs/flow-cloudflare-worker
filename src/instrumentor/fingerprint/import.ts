import { FingerprintLoader } from '../types'
import { Script } from '../../shared/scripts'

// This template will be replaced during injection by the worker.
export const scriptBehaviorPath = '<SCRIPT_BEHAVIOR_PATH>'

export async function importFingerprintLoader(): Promise<FingerprintLoader> {
  const url = new URL(document.location.href)
  const scriptName: Script = 'loader.js'
  url.pathname = `${scriptBehaviorPath}/${scriptName}`
  url.search = ''
  url.hash = ''

  return import(url.toString())
}
