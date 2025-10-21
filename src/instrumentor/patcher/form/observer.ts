import { injectSignalsElement } from './injectSignalsElement'
import { PatcherContext } from '../context'

function isForm(element: Node): element is HTMLFormElement {
  return element instanceof HTMLFormElement
}

/**
 * Observes and tracks changes to forms on the document, such as modifications to the "action" attribute or the addition of new form elements.
 *
 * @param {PatcherContext} ctx - The context object used in the handler for observed form changes.
 */
export function observeForms(ctx: PatcherContext) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Track changes to "action" attribute in existing forms
      if (mutation.type === 'attributes' && isForm(mutation.target)) {
        console.debug('Form action changed:', {
          form: mutation.target,
          oldValue: mutation.oldValue,
          newValue: mutation.target.action,
        })
        onFormChange(mutation.target, ctx)
      }

      // Track new forms added to the page
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement

            // Check if the added node itself is a form
            if (isForm(element)) {
              console.debug('New form added')
              onFormChange(element as HTMLFormElement, ctx)
            }

            // Check if the added node contains any forms
            const forms = element.querySelectorAll('form')
            forms.forEach((form) => {
              console.debug('New form added (nested):')
              onFormChange(form, ctx)
            })
          }
        })
      }
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true, // Important: observe all descendants, not just direct children
    attributes: true,
    attributeFilter: ['action', 'method'],
    attributeOldValue: true, // Capture the old value when action changes
  })
}

/**
 * Handles changes to a given form element and applies necessary patches.
 *
 * @param {HTMLFormElement} form - The form element that has changed.
 * @param {PatcherContext} ctx - Context information used to apply the patch.
 */
function onFormChange(form: HTMLFormElement, ctx: PatcherContext) {
  injectSignalsElement(form, ctx)
}
