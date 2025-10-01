import { FingerprintJSLoader } from './types'
import { Script } from '../shared/scripts'

// This template will be replaced during injection by the worker.
const scriptBehaviorPath = '<SCRIPT_BEHAVIOR_PATH>'

export async function importFingerprintLoader(): Promise<FingerprintJSLoader> {
  const url = new URL(document.location.href)
  const scriptName: Script = 'loader.js'
  url.pathname = `${scriptBehaviorPath}/${scriptName}`
  url.search = ''
  url.hash = ''

  return import(url.toString())
}
