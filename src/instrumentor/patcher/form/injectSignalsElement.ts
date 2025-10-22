import { PatcherContext } from '../context'
import { SIGNALS_KEY } from '../../../shared/const'

const REMOVE_LISTENER_SYMBOL = Symbol('removeListener')

/**
 * Patches a given HTML form to include additional fingerprinting signals during submission.
 *
 * @param {HTMLFormElement} form The form element to be patched.
 * @param {PatcherContext} ctx The context used for retrieving signals and additional operations.
 */
export function injectSignalsElement(form: HTMLFormElement, ctx: PatcherContext) {
  // Always remove the existing listener before adding a new one to prevent duplicates
  removeSubmitListener(form)

  if (!ctx.isProtectedUrl(form.action, form.method)) {
    return
  }

  const handleSubmit = async (event: SubmitEvent) => {
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
      if (form.querySelector(`input[name="${SIGNALS_KEY}"]`)) {
        return
      }
      const field = createSignalsField(signals)
      form.appendChild(field)
    } catch (e) {
      console.error('Error getting signals during form submission:', e)
    }
  }

  form.addEventListener('submit', handleSubmit)

  Object.assign(form, {
    // Attach a custom property to the form element to store the remove listener function if needed.
    [REMOVE_LISTENER_SYMBOL]: () => {
      form.removeEventListener('submit', handleSubmit)
    },
  })
}

/**
 * Removes a previously attached submit event listener from a given form element, if it exists.
 *
 * @param {HTMLFormElement & { [REMOVE_LISTENER_SYMBOL]?: () => void }} form - The form element from which the submit event listener is to be removed. It may include the custom property defined by REMOVE_LISTENER_SYMBOL.
 */
function removeSubmitListener(form: HTMLFormElement & { [REMOVE_LISTENER_SYMBOL]?: () => void }) {
  const removeListener = form[REMOVE_LISTENER_SYMBOL]
  if (typeof removeListener === 'function') {
    console.debug('Removing existing submit listener from form')
    removeListener()
  }
}

/**
 * Creates a hidden input field with the specified signal value.
 *
 * @param {string} signals - The value to be assigned to the hidden input field.
 * @return {HTMLInputElement} The created hidden input field with the specified signal value.
 */
function createSignalsField(signals: string): HTMLInputElement {
  const field = document.createElement('input')
  field.hidden = true
  field.value = signals
  field.name = SIGNALS_KEY
  return field
}
