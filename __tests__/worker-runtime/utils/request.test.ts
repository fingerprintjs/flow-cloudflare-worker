import { describe, it, expect } from 'vitest'
import { copyRequest } from '../../../src/worker/utils/request'

describe('Copy request', () => {
  describe('HTTP Methods', () => {
    it('should copy GET request correctly', () => {
      const request = new Request('https://example.com/', {
        method: 'GET',
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            Accept: 'application/json',
          },
        },
      })

      expect(requestClone.method).toEqual('GET')
      expect(requestClone.url).toEqual('https://example.com/')
      expect(requestClone.headers.get('Accept')).toEqual('application/json')
    })

    it('should copy PUT request with JSON body', async () => {
      const requestBody = JSON.stringify({ id: 1, name: 'test' })
      const request = new Request('https://example.com/users/1', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            Authorization: 'Bearer token123',
          },
        },
      })

      expect(requestClone.method).toEqual('PUT')
      expect(await requestClone.text()).toEqual(requestBody)
      expect(requestClone.headers.get('Authorization')).toEqual('Bearer token123')
    })

    it('should copy DELETE request', () => {
      const request = new Request('https://example.com/users/1', {
        method: 'DELETE',
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            Authorization: 'Bearer token123',
          },
        },
      })

      expect(requestClone.method).toEqual('DELETE')
      expect(requestClone.url).toEqual('https://example.com/users/1')
      expect(requestClone.headers.get('Authorization')).toEqual('Bearer token123')
    })

    it('should copy PATCH request', async () => {
      const requestBody = JSON.stringify({ name: 'updated' })
      const request = new Request('https://example.com/users/1', {
        method: 'PATCH',
        body: requestBody,
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        },
      })

      expect(requestClone.method).toEqual('PATCH')
      expect(await requestClone.text()).toEqual(requestBody)
      expect(requestClone.headers.get('Content-Type')).toEqual('application/json-patch+json')
    })

    it('should copy HEAD request', () => {
      const request = new Request('https://example.com/check', {
        method: 'HEAD',
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            'Cache-Control': 'no-cache',
          },
        },
      })

      expect(requestClone.method).toEqual('HEAD')
      expect(requestClone.headers.get('Cache-Control')).toEqual('no-cache')
    })

    it('should copy OPTIONS request', () => {
      const request = new Request('https://example.com/', {
        method: 'OPTIONS',
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            'Access-Control-Request-Method': 'POST',
          },
        },
      })

      expect(requestClone.method).toEqual('OPTIONS')
      expect(requestClone.headers.get('Access-Control-Request-Method')).toEqual('POST')
    })
  })

  describe('Request Bodies', () => {
    it('should copy request with a modified FormData body', async () => {
      const formData = new FormData()
      formData.append('name', 'test')
      formData.append('email', 'test@example.com')

      const request = new Request('https://example.com/submit', {
        method: 'POST',
        body: formData,
      })
      const requestHeaders = new Headers(request.headers)
      // When modifying FormData, we also need to remove the old Content-Type header. Otherwise, the boundary will be different and the request will fail.
      requestHeaders.delete('Content-Type')

      const modifiedFormData = await request.clone().formData()
      modifiedFormData.delete('email')

      const requestClone = copyRequest({
        request,
        init: {
          body: modifiedFormData,
          headers: requestHeaders,
        },
      })

      const requestCloneFormData = await requestClone.formData()
      expect(requestCloneFormData.has('email')).toBeFalsy()
      expect(requestCloneFormData.get('name')).toEqual('test')
    })

    it('should copy request with FormData body', async () => {
      const formData = new FormData()
      formData.append('name', 'test')
      formData.append('email', 'test@example.com')

      const request = new Request('https://example.com/submit', {
        method: 'POST',
        body: formData,
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            'X-Custom': 'value',
          },
        },
      })

      expect(requestClone.method).toEqual('POST')
      expect(requestClone.headers.get('X-Custom')).toEqual('value')

      const bodyText = await requestClone.text()
      expect(bodyText).toContain('name')
      expect(bodyText).toContain('test')
    })

    it('should copy request with URLSearchParams body', async () => {
      const params = new URLSearchParams()
      params.append('query', 'test search')
      params.append('limit', '10')

      const request = new Request('https://example.com/search', {
        method: 'POST',
        body: params,
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      })

      expect(requestClone.method).toEqual('POST')
      expect(await requestClone.text()).toEqual('query=test+search&limit=10')
      expect(requestClone.headers.get('Content-Type')).toEqual('application/x-www-form-urlencoded')
    })

    it('should copy request with Blob body', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const request = new Request('https://example.com/upload', {
        method: 'POST',
        body: blob,
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            'X-Upload-Type': 'blob',
          },
        },
      })

      expect(requestClone.method).toEqual('POST')
      expect(await requestClone.text()).toEqual('test content')
      expect(requestClone.headers.get('X-Upload-Type')).toEqual('blob')
    })

    it('should copy GET request with no body', () => {
      const request = new Request('https://example.com/api/data', {
        method: 'GET',
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            Accept: 'application/json',
          },
        },
      })

      expect(requestClone.method).toEqual('GET')
      expect(requestClone.body).toBeNull()
      expect(requestClone.headers.get('Accept')).toEqual('application/json')
    })
  })

  describe('Headers', () => {
    it('should handle empty headers in init', () => {
      const request = new Request('https://example.com/', {
        headers: {
          'Original-Header': 'value',
        },
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {},
        },
      })

      expect(Object.fromEntries(requestClone.headers.entries())).toEqual({})
    })

    it('should add multiple headers', () => {
      const request = new Request('https://example.com/')

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer token',
            'X-Custom-1': 'value1',
            'X-Custom-2': 'value2',
          },
        },
      })

      expect(requestClone.headers.get('Accept')).toEqual('application/json')
      expect(requestClone.headers.get('Authorization')).toEqual('Bearer token')
      expect(requestClone.headers.get('X-Custom-1')).toEqual('value1')
      expect(requestClone.headers.get('X-Custom-2')).toEqual('value2')
    })

    it('should override existing headers', () => {
      const request = new Request('https://example.com/', {
        headers: {
          'Content-Type': 'text/plain',
          Accept: 'text/html',
        },
      })

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      })

      expect(requestClone.headers.get('Content-Type')).toEqual('application/json')
      expect(requestClone.headers.get('Accept')).toBeNull() // Original headers are replaced
    })

    it('should handle header case sensitivity correctly', () => {
      const request = new Request('https://example.com/')

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            'content-type': 'application/json',
            AUTHORIZATION: 'Bearer token',
          },
        },
      })

      expect(requestClone.headers.get('Content-Type')).toEqual('application/json')
      expect(requestClone.headers.get('authorization')).toEqual('Bearer token')
    })

    it('should handle special headers', () => {
      const request = new Request('https://example.com/')

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9',
            'User-Agent': 'CustomAgent/1.0',
            Referer: 'https://referrer.com',
            Cookie: 'session=abc123; theme=dark',
          },
        },
      })

      expect(requestClone.headers.get('Authorization')).toEqual('Bearer eyJhbGciOiJIUzI1NiJ9')
      expect(requestClone.headers.get('User-Agent')).toEqual('CustomAgent/1.0')
      expect(requestClone.headers.get('Referer')).toEqual('https://referrer.com')
      expect(requestClone.headers.get('Cookie')).toEqual('session=abc123; theme=dark')
    })
  })

  describe('URL Handling', () => {
    it('should accept URL object instead of string', () => {
      const request = new Request('https://example.com/')
      const newUrl = new URL('https://api.example.com/v1/data')

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            Accept: 'application/json',
          },
        },
        url: newUrl,
      })

      expect(requestClone.url).toEqual('https://api.example.com/v1/data')
      expect(requestClone.headers.get('Accept')).toEqual('application/json')
    })

    it('should preserve URL with query parameters', () => {
      const request = new Request('https://example.com/api?param1=value1&param2=value2')

      const requestClone = copyRequest({
        request,
        init: {
          headers: {
            Accept: 'application/json',
          },
        },
      })

      expect(requestClone.url).toEqual('https://example.com/api?param1=value1&param2=value2')
    })

    it('should handle URL modification with query parameters', () => {
      const request = new Request('https://example.com/old?old=param')

      const requestClone = copyRequest({
        request,
        init: {
          method: 'POST',
        },
        url: 'https://api.example.com/new?new=param&limit=10',
      })

      expect(requestClone.url).toEqual('https://api.example.com/new?new=param&limit=10')
      expect(requestClone.method).toEqual('POST')
    })
  })
})
