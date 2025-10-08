import { describe, expect, it } from 'vitest'
import { findCookie } from '../../src/worker/cookies'

describe('Cookies', () => {
  describe('Find cookie', () => {
    // Basic successful cases
    it('should find single cookie', () => {
      const result = findCookie('sessionId=abc123', 'sessionId')
      expect(result).toBe('sessionId=abc123')
    })

    it('should find cookie in middle of multiple cookies', () => {
      const result = findCookie('sessionId=abc123; _iidt=xyz789; theme=dark', '_iidt')
      expect(result).toBe('_iidt=xyz789')
    })

    it('should find first cookie in multiple cookies', () => {
      const result = findCookie('sessionId=abc123; _iidt=xyz789; theme=dark', 'sessionId')
      expect(result).toBe('sessionId=abc123')
    })

    it('should find last cookie in multiple cookies', () => {
      const result = findCookie('sessionId=abc123; _iidt=xyz789; theme=dark', 'theme')
      expect(result).toBe('theme=dark')
    })

    // Cookie not found cases
    it('should return undefined for non-existent cookie', () => {
      const result = findCookie('sessionId=abc123; theme=dark', 'nonexistent')
      expect(result).toBe(undefined)
    })

    it('should not match partial cookie names', () => {
      const result = findCookie('sessionId=abc123; theme=dark', 'session')
      expect(result).toBe(undefined)
    })

    it('should be case sensitive', () => {
      const result = findCookie('sessionId=abc123; theme=dark', 'Id')
      expect(result).toBe(undefined)
    })

    // Edge cases with empty/whitespace
    it('should return undefined for empty cookie string', () => {
      const result = findCookie('', 'test')
      expect(result).toBe(undefined)
    })

    it('should return undefined for empty cookie name', () => {
      const result = findCookie('test=value', '')
      expect(result).toBe(undefined)
    })

    it('should return undefined for whitespace-only cookie string', () => {
      const result = findCookie(' ', 'test')
      expect(result).toBe(undefined)
    })

    // Special characters and values
    it('should handle URL-encoded values', () => {
      const result = findCookie('token=Bearer%20abc123', 'token')
      expect(result).toBe('token=Bearer abc123')
    })

    it('should handle special characters in values', () => {
      const result = findCookie('path=/api/v1; secure=true', 'path')
      expect(result).toBe('path=/api/v1')
    })

    it('should handle JSON-like values', () => {
      const result = findCookie('json={"key":"value"}; other=test', 'json')
      expect(result).toBe('json={"key":"value"}')
    })

    it('should handle cookie names with dashes', () => {
      const result = findCookie('name-with-dashes=value', 'name-with-dashes')
      expect(result).toBe('name-with-dashes=value')
    })

    it('should handle cookie names with underscores', () => {
      const result = findCookie('name_with_underscores=value', 'name_with_underscores')
      expect(result).toBe('name_with_underscores=value')
    })

    // Empty values
    it('should handle empty cookie values', () => {
      const result = findCookie('empty=; test=value', 'empty')
      expect(result).toBe('empty=')
    })

    it('should not include trailing spaces in cookie value', () => {
      const result = findCookie('test=value ; other=value2', 'test')
      expect(result).toBe('test=value')
    })

    // Similar cookie names
    it('should match exact cookie name, not similar ones', () => {
      const result = findCookie('user=john; username=jane; userinfo=data', 'user')
      expect(result).toBe('user=john')
    })

    it('should not match cookie names that start with target name', () => {
      const result = findCookie('test=value; testmore=othervalue', 'test')
      expect(result).toBe('test=value')
    })

    it('should match cookies containing multiple = signs', () => {
      const cookieStr = 'auth=base64_iidt==; _iidt=asdfaasf;'

      expect(findCookie(cookieStr, '_iidt')).toEqual('_iidt=asdfaasf')
      expect(findCookie(cookieStr, 'auth')).toEqual('auth=base64_iidt==')
    })
  })
})
