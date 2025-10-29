import { PatcherContext } from '../context'
import { injectSignalsElement } from './injectSignalsElement'
import { observeForms } from './observer'

export function patchForms(ctx: PatcherContext) {
  document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('form')

    forms.forEach((form) => {
      injectSignalsElement(form, ctx)
    })

    observeForms(ctx)
  })
}
