import { BODY_LINKED_ID_KEY, BODY_TAG_KEY, serializeTagForTransport } from '../../../../shared/businessContext'
import { extractBusinessContextFromWindow } from './fromWindow'

/**
 * Injects window business context as hidden form fields when those fields are not
 * already present (customer body fields win). Native form submit cannot set headers.
 */
export function injectWindowBusinessContextAsFormFields(form: HTMLFormElement): void {
  const windowContext = extractBusinessContextFromWindow()

  if (windowContext.tag !== undefined && !form.querySelector(`[name="${BODY_TAG_KEY}"]`)) {
    form.appendChild(createHiddenField(BODY_TAG_KEY, serializeTagForTransport(windowContext.tag)))
  }

  if (windowContext.linkedId !== undefined && !form.querySelector(`[name="${BODY_LINKED_ID_KEY}"]`)) {
    form.appendChild(createHiddenField(BODY_LINKED_ID_KEY, windowContext.linkedId))
  }
}

function createHiddenField(name: string, value: string): HTMLInputElement {
  const field = document.createElement('input')
  field.hidden = true
  field.name = name
  field.value = value
  return field
}
