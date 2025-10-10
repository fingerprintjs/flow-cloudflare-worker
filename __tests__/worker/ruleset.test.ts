import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRulesetProcessor, RuleAction } from '../../src/worker/fingerprint/ruleset'

describe('Ruleset evaluation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Block action', () => {
    it('should return custom response', async () => {
      const rule: RuleAction = {
        type: 'block',
        headers: [
          {
            name: 'x-blocked',
            value: 'true',
          },
          {
            name: 'set-cookie',
            value: 'is_blocked=true',
          },
          {
            name: 'set-cookie',
            value: 'id=123',
          },
        ],
        rule_id: '1',
        body: 'Access denied',
        rule_expression: '',
        ruleset_id: '',
        status_code: 400,
      }
      const request = new Request('https://example.com/api', {
        method: 'POST',
      })

      const response = await makeRulesetProcessor(rule)(request)

      expect(await response.text()).toEqual('Access denied')
      expect(response.status).toEqual(400)
      expect(response.headers.get('x-blocked')).toEqual('true')
      expect(response.headers.getSetCookie()).toHaveLength(2)
      expect(response.headers.getSetCookie()).toEqual(expect.arrayContaining(['is_blocked=true', 'id=123']))
      // Request to origin should not be made
      expect(fetch).toHaveBeenCalledTimes(0)
    })

    it('should return custom response with just body', async () => {
      const rule: RuleAction = {
        type: 'block',
        rule_id: '1',
        body: 'Access denied',
        rule_expression: '',
        ruleset_id: '',
      }
      const request = new Request('https://example.com/api', {
        method: 'POST',
      })

      const response = await makeRulesetProcessor(rule)(request)

      expect(await response.text()).toEqual('Access denied')
      expect(response.status).toEqual(200)
      // Request to origin should not be made
      expect(fetch).toHaveBeenCalledTimes(0)
    })
  })

  describe('Allow action', () => {
    it('should fetch origin with modified request', async () => {
      const mockResponse = new Response('')
      vi.mocked(fetch).mockResolvedValue(mockResponse)

      const rule: RuleAction = {
        type: 'allow',
        request_header_modifications: {
          set: [
            {
              name: 'x-allow',
              value: 'true',
            },
          ],
          remove: ['x-remove'],
          append: [
            {
              name: 'set-cookie',
              value: 'is_allowed=true',
            },
          ],
        },
        rule_id: '1',
        rule_expression: '',
        ruleset_id: '',
      }
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'x-remove': 'true',
          'set-cookie': 'request_cookie=true',
        },
      })
      const response = await makeRulesetProcessor(rule)(request)
      expect(response).toBe(mockResponse)

      const requestArg = vi.mocked(fetch).mock.calls[0][0] as Request
      expect(requestArg).toBeInstanceOf(Request)
      expect(Array.from(requestArg.headers as unknown as ArrayLike<unknown>)).toMatchInlineSnapshot(`
        [
          [
            "set-cookie",
            "request_cookie=true",
          ],
          [
            "set-cookie",
            "is_allowed=true",
          ],
          [
            "x-allow",
            "true",
          ],
        ]
      `)
    })

    it('should fetch origin with modified request with the same header to delete, set and append', async () => {
      const mockResponse = new Response('')
      vi.mocked(fetch).mockResolvedValue(mockResponse)

      const rule: RuleAction = {
        type: 'allow',
        request_header_modifications: {
          set: [
            {
              name: 'x-allow',
              value: 'true',
            },
          ],
          remove: ['x-allow'],
          append: [
            {
              name: 'x-allow',
              value: 'is_appended=true',
            },
          ],
        },
        rule_id: '1',
        rule_expression: '',
        ruleset_id: '',
      }
      const request = new Request('https://example.com/api', {
        method: 'POST',
      })
      const response = await makeRulesetProcessor(rule)(request)
      expect(response).toBe(mockResponse)

      const requestArg = vi.mocked(fetch).mock.calls[0][0] as Request
      expect(requestArg).toBeInstanceOf(Request)
      expect(Array.from(requestArg.headers as unknown as ArrayLike<unknown>)).toMatchInlineSnapshot(`
        [
          [
            "x-allow",
            "true, is_appended=true",
          ],
        ]
      `)
    })

    it('should fetch origin with just "remove" option', async () => {
      const mockResponse = new Response('')
      vi.mocked(fetch).mockResolvedValue(mockResponse)

      const rule: RuleAction = {
        type: 'allow',
        request_header_modifications: {
          remove: ['x-remove'],
        },
        rule_id: '1',
        rule_expression: '',
        ruleset_id: '',
      }
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'x-remove': 'true',
          'set-cookie': 'request_cookie=true',
        },
      })
      const response = await makeRulesetProcessor(rule)(request)
      expect(response).toBe(mockResponse)

      const requestArg = vi.mocked(fetch).mock.calls[0][0] as Request
      expect(requestArg).toBeInstanceOf(Request)
      expect(Array.from(requestArg.headers as unknown as ArrayLike<unknown>)).toMatchInlineSnapshot(`
        [
          [
            "set-cookie",
            "request_cookie=true",
          ],
        ]
      `)
    })

    it('should fetch origin with just "set" option', async () => {
      const mockResponse = new Response('')
      vi.mocked(fetch).mockResolvedValue(mockResponse)

      const rule: RuleAction = {
        type: 'allow',
        request_header_modifications: {
          set: [
            {
              name: 'x-allow',
              value: 'true',
            },
          ],
        },
        rule_id: '1',
        rule_expression: '',
        ruleset_id: '',
      }
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'x-remove': 'true',
          'set-cookie': 'request_cookie=true',
        },
      })
      const response = await makeRulesetProcessor(rule)(request)
      expect(response).toBe(mockResponse)

      const requestArg = vi.mocked(fetch).mock.calls[0][0] as Request
      expect(requestArg).toBeInstanceOf(Request)
      expect(Array.from(requestArg.headers as unknown as ArrayLike<unknown>)).toMatchInlineSnapshot(`
        [
          [
            "set-cookie",
            "request_cookie=true",
          ],
          [
            "x-allow",
            "true",
          ],
          [
            "x-remove",
            "true",
          ],
        ]
      `)
    })

    it('should fetch origin with just "append" option', async () => {
      const mockResponse = new Response('')
      vi.mocked(fetch).mockResolvedValue(mockResponse)

      const rule: RuleAction = {
        type: 'allow',
        request_header_modifications: {
          append: [
            {
              name: 'set-cookie',
              value: 'is_allowed=true',
            },
          ],
        },
        rule_id: '1',
        rule_expression: '',
        ruleset_id: '',
      }
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'x-remove': 'true',
          'set-cookie': 'request_cookie=true',
        },
      })
      const response = await makeRulesetProcessor(rule)(request)
      expect(response).toBe(mockResponse)

      const requestArg = vi.mocked(fetch).mock.calls[0][0] as Request
      expect(requestArg).toBeInstanceOf(Request)
      expect(Array.from(requestArg.headers as unknown as ArrayLike<unknown>)).toMatchInlineSnapshot(`
        [
          [
            "set-cookie",
            "request_cookie=true",
          ],
          [
            "set-cookie",
            "is_allowed=true",
          ],
          [
            "x-remove",
            "true",
          ],
        ]
      `)
    })
  })
})
