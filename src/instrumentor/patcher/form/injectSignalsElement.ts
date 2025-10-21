import { PatcherContext } from '../context'
import { FP_FIELD_NAME } from './const'

/**
 * Patches a given HTML form to include additional fingerprinting signals during submission.
 *
 * @param {HTMLFormElement} form The form element to be patched.
 * @param {PatcherContext} ctx The context used for retrieving signals and additional operations.
 */
export function injectSignalsElement(form: HTMLFormElement, ctx: PatcherContext) {
  if (!ctx.isProtectedUrl(form.action, form.method)) {
    console.debug(
      `Form action "${form.action}" or method "${form.method}" is not on list of protected apis, skipping patching.`
    )
    return
  }

  form.addEventListener('submit', async (event) => {
    // Ignore form submissions if they were prevented by another handler (since this patcher is only for native submissions)
    if (event.defaultPrevented) {
      console.debug('Form submission prevented by another handler')
      return
    }

    const signals = await ctx.getSignals()

    try {
      if (!signals) {
        console.debug('No signals found for form submission')
        return
      }

      // If signals are already present, we don't need to add them again
      if (form.querySelector(`input[name="${FP_FIELD_NAME}"]`)) {
        return
      }

      const field = document.createElement('input')
      field.hidden = true
      field.value = signals
      field.name = FP_FIELD_NAME

      form.appendChild(field)
    } catch (e) {
      console.error('Error getting signals during form submission:', e)
    }
  })
}
