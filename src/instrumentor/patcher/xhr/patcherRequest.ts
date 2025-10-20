import { XHRFingerprintMetadata } from './types'
import { PatcherRequest } from '../types'

/**
 * Creates a PatcherRequest object from an XMLHttpRequest and its metadata.
 *
 * @param {XMLHttpRequest} request - The XMLHttpRequest instance to configure.
 * @param {XHRFingerprintMetadata} metadata - The metadata containing URL and method for the request.
 * @return {PatcherRequest} A PatcherRequest object with URL, method, and header-setting capability.
 */
export function createPatcherRequest(request: XMLHttpRequest, metadata: XHRFingerprintMetadata): PatcherRequest {
  return {
    url: metadata.url,
    method: metadata.method,
    setHeader: (name: string, value: string) => {
      try {
        request.setRequestHeader(name, value)
      } catch (e) {
        console.warn('Failed to set XHR request header:', e)
      }
    },
  }
}
