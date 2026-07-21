import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  extractBusinessContextFromWindow,
  injectWindowBusinessContextAsFormFields,
  injectWindowBusinessContextAsHeaders,
} from '../../../../src/scripts/instrumentor/patcher/businessContext'
import { HEADER_LINKED_ID_KEY, HEADER_TAG_KEY } from '../../../../src/shared/businessContext'
import { PatcherRequest } from '../../../../src/scripts/instrumentor/patcher/types'

describe('instrumentor window → transport injection', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__fp_tag')
    Reflect.deleteProperty(globalThis, '__fp_linked_id')
  })

  describe('extractBusinessContextFromWindow', () => {
    it('reads window values', () => {
      const target = {
        __fp_tag: { source: 'window' },
        __fp_linked_id: 'window-linked-id',
      } satisfies Record<string, unknown>

      expect(extractBusinessContextFromWindow(target)).toEqual({
        tag: { source: 'window' },
        linkedId: 'window-linked-id',
      })
    })

    it('ignores prototype-inherited linkedId', () => {
      const proto = { __fp_linked_id: 'inherited' }
      const target: object = Object.create(proto)
      expect(extractBusinessContextFromWindow(target)).toEqual({})
    })
  })

  describe('injectWindowBusinessContextAsHeaders', () => {
    it('injects window values when headers are absent', () => {
      Reflect.set(globalThis, '__fp_tag', { source: 'window' })
      Reflect.set(globalThis, '__fp_linked_id', 'window-linked-id')

      const setHeader = vi.fn()
      const request = {
        url: 'https://example.com/api',
        method: 'POST',
        setIncludeCredentials: () => false,
        setHeader,
      } satisfies PatcherRequest

      injectWindowBusinessContextAsHeaders(request, undefined)

      expect(setHeader).toHaveBeenCalledWith(HEADER_TAG_KEY, JSON.stringify({ source: 'window' }))
      expect(setHeader).toHaveBeenCalledWith(HEADER_LINKED_ID_KEY, 'window-linked-id')
    })

    it('JSON-encodes non-string window tags for header transport', () => {
      Reflect.set(globalThis, '__fp_tag', 123)

      const setHeader = vi.fn()
      const request = {
        url: 'https://example.com/api',
        method: 'POST',
        setIncludeCredentials: () => false,
        setHeader,
      } satisfies PatcherRequest

      injectWindowBusinessContextAsHeaders(request, undefined)

      expect(setHeader).toHaveBeenCalledWith(HEADER_TAG_KEY, '123')
    })

    it('does not overwrite customer headers', () => {
      Reflect.set(globalThis, '__fp_tag', 'window-tag')
      Reflect.set(globalThis, '__fp_linked_id', 'window-linked-id')

      const setHeader = vi.fn()
      const request = {
        url: 'https://example.com/api',
        method: 'POST',
        setIncludeCredentials: () => false,
        setHeader,
      } satisfies PatcherRequest

      injectWindowBusinessContextAsHeaders(
        request,
        new Headers({
          [HEADER_TAG_KEY]: 'customer-tag',
          [HEADER_LINKED_ID_KEY]: 'customer-linked-id',
        })
      )

      expect(setHeader).not.toHaveBeenCalled()
    })
  })

  describe('injectWindowBusinessContextAsFormFields', () => {
    it('appends hidden fields when absent', () => {
      Reflect.set(globalThis, '__fp_tag', 'window-tag')
      Reflect.set(globalThis, '__fp_linked_id', 'window-linked-id')

      const form = document.createElement('form')
      injectWindowBusinessContextAsFormFields(form)

      const tagInput = form.querySelector('input[name="fp_tag"]')
      const linkedIdInput = form.querySelector('input[name="fp_linked_id"]')
      expect(tagInput).toBeInstanceOf(HTMLInputElement)
      expect(linkedIdInput).toBeInstanceOf(HTMLInputElement)
      if (!(tagInput instanceof HTMLInputElement) || !(linkedIdInput instanceof HTMLInputElement)) {
        return
      }
      expect(tagInput.value).toBe(JSON.stringify('window-tag'))
      expect(linkedIdInput.value).toBe('window-linked-id')
    })

    it('does not overwrite existing form fields', () => {
      Reflect.set(globalThis, '__fp_tag', 'window-tag')

      const form = document.createElement('form')
      const existing = document.createElement('input')
      existing.name = 'fp_tag'
      existing.value = 'customer-tag'
      form.appendChild(existing)

      injectWindowBusinessContextAsFormFields(form)

      expect(form.querySelectorAll('input[name="fp_tag"]')).toHaveLength(1)
      const tagInput = form.querySelector('input[name="fp_tag"]')
      expect(tagInput).toBeInstanceOf(HTMLInputElement)
      if (!(tagInput instanceof HTMLInputElement)) {
        return
      }
      expect(tagInput.value).toBe('customer-tag')
    })
  })
})
