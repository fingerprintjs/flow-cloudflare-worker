import { logger } from '../../../shared/logger'
import { PatcherContext } from '../context'
import { createPatchedOpen } from './open'
import { createPatchedSend } from './send'
import { createPatchedSetRequestHeader } from './setRequestHeader'

/**
 * Patches the global XMLHttpRequest to automatically add Fingerprint signals
 * to requests made to protected APIs.
 */
export function patchXHR(ctx: PatcherContext) {
  const XHR = globalThis.XMLHttpRequest

  if (!XHR || typeof XHR.prototype?.open !== 'function' || typeof XHR.prototype?.send !== 'function') {
    logger.warn('XMLHttpRequest is not available.')
    return
  }

  XHR.prototype.open = createPatchedOpen(ctx)
  XHR.prototype.send = createPatchedSend(ctx)
  XHR.prototype.setRequestHeader = createPatchedSetRequestHeader()

  logger.debug('XMLHttpRequest patched successfully.')
}
