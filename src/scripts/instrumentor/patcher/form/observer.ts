import { injectSignalsElement } from './injectSignalsElement'
import { PatcherContext } from '../context'

function isForm(element: Node): element is HTMLFormElement {
  return element instanceof HTMLFormElement
}

function isElement(element: Node): element is HTMLElement {
  return element instanceof HTMLElement
}

/**
 * Observes and tracks changes to forms on the document, such as modifications to the "action" attribute or the addition of new form elements.
 *
 * @param {PatcherContext} ctx - The context object used in the handler for observed form changes.
 */
export function observeForms(ctx: PatcherContext) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Track changes to the "action" or "method" attributes in existing forms
      if (mutation.type === 'attributes' && isForm(mutation.target)) {
        console.debug('Form action changed')
        onFormChange(mutation.target, ctx)
      }

      // Track new forms added to the page
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && isElement(node)) {
            // Check if the added node itself is a form
            if (isForm(node)) {
              console.debug('New form added')
              onFormChange(node, ctx)
            }

            // Check if the added node contains any forms
            const forms = node.querySelectorAll('form')
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
    subtree: true,
    attributes: true,
    attributeFilter: ['action', 'method', 'enctype'],
  })
}

/**
 * Handles changes to a given form element and applies the necessary patches.
 *
 * @param {HTMLFormElement} form - The form element that has changed.
 * @param {PatcherContext} ctx - Context information used to apply the patch.
 */
function onFormChange(form: HTMLFormElement, ctx: PatcherContext) {
  injectSignalsElement(form, ctx)
}
