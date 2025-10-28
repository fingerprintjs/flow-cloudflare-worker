import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WritablePatcherContext } from '../../../../src/scripts/instrumentor/patcher/context'
import { patchForms } from '../../../../src/scripts/instrumentor/patcher/form/form'
import { wait } from '../../../utils/wait'
import { SIGNALS_KEY } from '../../../../src/shared/const'
import { mockUrl } from '../../../utils/mockEnv'

const formHtml = `
  <form id="loginForm" action="/login" method="POST">
    <input type="text" name="username">
    <input type="password" name="password">
    <button type="submit">Login</button>
  </form>
`

const sampleHtmlWithForm = `
<!DOCTYPE html>
<html>
<body>
  ${formHtml}
</body>
</html>
`

async function submitForm(form: HTMLFormElement) {
  form.querySelector<HTMLButtonElement>('[type="submit"]')?.click()

  await wait(10)
}

async function emitDomReadyEvent() {
  document.dispatchEvent(new Event('DOMContentLoaded'))

  // Wait for event to propagate
  await wait(10)
}

describe('Form patcher', () => {
  let mockContext: WritablePatcherContext

  beforeEach(async () => {
    vi.clearAllMocks()

    location.href = mockUrl('/')

    mockContext = new WritablePatcherContext([
      {
        method: 'POST',
        url: mockUrl('/login'),
      },
      {
        method: 'POST',
        url: mockUrl('/login/*'),
      },
    ])

    mockContext.setSignalsProvider(async () => 'test-signals-data')

    document.body.innerHTML = sampleHtmlWithForm
  })

  it('should inject signals element into forms on submission', async () => {
    patchForms(mockContext)
    await emitDomReadyEvent()

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeTruthy()
    expect(input!.hidden).toEqual(true)
    expect(input!.value).toEqual('test-signals-data')
  })

  it('should not inject signals element into forms on submission multiple times', async () => {
    patchForms(mockContext)
    await emitDomReadyEvent()

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    // Modify form action. It should be picked up by the mutation observer.
    form!.action = '/login/123'
    // Wait for mutation observer to process the change
    await wait(10)

    await submitForm(form!)

    const inputs = form!.querySelectorAll<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(inputs).toHaveLength(1)
  })

  it('should not inject signals element into form with enctype text/plain', async () => {
    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()
    form!.enctype = 'text/plain'

    patchForms(mockContext)
    await emitDomReadyEvent()

    await submitForm(form!)

    const inputs = form!.querySelectorAll<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(inputs).toHaveLength(0)
  })

  it('should not inject signals element into form with get method', async () => {
    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()
    form!.method = 'get'

    patchForms(mockContext)
    await emitDomReadyEvent()

    await submitForm(form!)

    const inputs = form!.querySelectorAll<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(inputs).toHaveLength(0)
  })

  it('should not inject signals element into form if it changes to not protected', async () => {
    patchForms(mockContext)
    await emitDomReadyEvent()

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    // Modify from action. It should be picked up by the mutation observer.
    form!.action = '/public/'
    // Wait for mutation observer to process the change
    await wait(10)

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeNull()
  })

  it('should not inject signals element into forms on submission if the action is not protected', async () => {
    document.querySelector<HTMLFormElement>('#loginForm')!.action = '/public/login'

    patchForms(mockContext)
    await emitDomReadyEvent()

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeFalsy()
  })

  it('should not inject signals element into forms on submission if the method is not protected', async () => {
    document.querySelector<HTMLFormElement>('#loginForm')!.method = 'PUT'

    patchForms(mockContext)
    await emitDomReadyEvent()

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeFalsy()
  })

  it('should inject signals if the URL changes to protected', async () => {
    document.querySelector<HTMLFormElement>('#loginForm')!.action = '/public/login'

    patchForms(mockContext)
    await emitDomReadyEvent()

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    form!.action = '/login'

    // Wait for mutation observer to process the change
    await wait(10)

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeTruthy()
  })

  it('should inject signals if the method changes to protected', async () => {
    document.querySelector<HTMLFormElement>('#loginForm')!.method = 'PUT'

    patchForms(mockContext)
    await emitDomReadyEvent()

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    form!.method = 'POST'

    // Wait for mutation observer to process the change
    await wait(10)

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeTruthy()
  })

  it('should inject signals for dynamically added form via innerHTML', async () => {
    document.body.innerHTML = ''

    patchForms(mockContext)
    await emitDomReadyEvent()

    document.body.innerHTML = sampleHtmlWithForm

    // Wait for mutation observer to handle change
    await wait(10)

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeTruthy()
  })

  it('should inject signals for dynamically added form via append', async () => {
    document.body.innerHTML = ''

    patchForms(mockContext)
    await emitDomReadyEvent()

    const container = document.createElement('div')
    container.innerHTML = formHtml

    document.body.appendChild(container)

    // Wait for mutation observer to handle change
    await wait(10)

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeTruthy()
  })

  it('should not inject signals for dynamically added form if the url is not protected', async () => {
    document.body.innerHTML = ''

    patchForms(mockContext)
    await emitDomReadyEvent()

    const container = document.createElement('div')
    container.innerHTML = formHtml
    container.querySelector<HTMLFormElement>('#loginForm')!.action = '/public/login'

    document.body.appendChild(container)

    // Wait for mutation observer to handle change
    await wait(10)

    const form = document.querySelector<HTMLFormElement>('#loginForm')
    expect(form).toBeTruthy()

    await submitForm(form!)

    const input = form!.querySelector<HTMLInputElement>(`input[name="${SIGNALS_KEY}"]`)
    expect(input).toBeFalsy()
  })
})
