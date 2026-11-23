import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}))

import { wranglerDelete, wranglerDeploy } from '../../e2e/deploy/utils/wrangler'

type ProcessOutcome = {
  code: number
  stdout?: string
  stderr?: string
}

function queueWranglerOutcomes(outcomes: ProcessOutcome[]) {
  for (const outcome of outcomes) {
    spawnMock.mockImplementationOnce(() => {
      const stdout = new PassThrough()
      const stderr = new PassThrough()
      const proc = Object.assign(new EventEmitter(), { stdout, stderr })

      queueMicrotask(() => {
        if (outcome.stdout) {
          stdout.write(outcome.stdout)
        }
        stdout.end()
        if (outcome.stderr) {
          stderr.write(outcome.stderr)
        }
        stderr.end()
        proc.emit('close', outcome.code)
      })

      return proc
    })
  }
}

describe('wrangler utils', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    spawnMock.mockReset()
  })

  describe('wranglerDelete', () => {
    it('returns false when Wrangler writes worker-not-found to stderr', async () => {
      queueWranglerOutcomes([
        {
          code: 1,
          stdout: ' ⛅️ wrangler 4.50.0\n───────────────────\n',
          stderr:
            '\x1b[31m✘ \x1b[41;31m[\x1b[41;97mERROR\x1b[41;31m]\x1b[0m \x1b[1mA request to the Cloudflare API (/accounts/***/workers/scripts/1795228372-log-level-config-react-spa/references) failed.\x1b[0m\n\n  This Worker does not exist on your account. [code: 10007]\n',
        },
      ])

      const deleted = await wranglerDelete('/tmp/app', ['--name', 'test-worker'])

      expect(deleted).toBe(false)
      expect(spawnMock).toHaveBeenCalledTimes(1)
    })

    it('returns false when Wrangler writes worker-not-found to stdout', async () => {
      queueWranglerOutcomes([
        {
          code: 1,
          stdout: 'This Worker does not exist on your account. [code: 10007]\n',
        },
      ])

      const deleted = await wranglerDelete('/tmp/app', ['--name', 'test-worker'])

      expect(deleted).toBe(false)
      expect(spawnMock).toHaveBeenCalledTimes(1)
    })

    it('retries on transient Cloudflare API 10013 errors and succeeds', async () => {
      vi.useFakeTimers()
      queueWranglerOutcomes([
        {
          code: 1,
          stderr:
            '✘ [ERROR] A request to the Cloudflare API (/accounts/***/workers/scripts/test-worker) failed.\n\n  An unknown error has occurred. [code: 10013]\n',
        },
        { code: 0, stdout: 'Successfully deleted test-worker\n' },
      ])

      const promise = wranglerDelete('/tmp/app', ['--name', 'test-worker'])
      await vi.runAllTimersAsync()

      await expect(promise).resolves.toBe(true)
      expect(spawnMock).toHaveBeenCalledTimes(2)
    })

    it('returns false when a retry after 10013 finds the worker already deleted', async () => {
      vi.useFakeTimers()
      queueWranglerOutcomes([
        {
          code: 1,
          stderr:
            '✘ [ERROR] A request to the Cloudflare API (/accounts/***/workers/scripts/test-worker) failed.\n\n  An unknown error has occurred. [code: 10013]\n',
        },
        {
          code: 1,
          stderr: '  This Worker does not exist on your account. [code: 10007]\n',
        },
      ])

      const promise = wranglerDelete('/tmp/app', ['--name', 'test-worker'])
      await vi.runAllTimersAsync()

      await expect(promise).resolves.toBe(false)
      expect(spawnMock).toHaveBeenCalledTimes(2)
    })

    it('rejects immediately on non-transient errors', async () => {
      queueWranglerOutcomes([
        {
          code: 1,
          stderr: '✘ [ERROR] Authentication error [code: 10000]\n',
        },
      ])

      await expect(wranglerDelete('/tmp/app', ['--name', 'test-worker'])).rejects.toThrow(
        'Worker removal failed with code 1'
      )
      expect(spawnMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('wranglerDeploy', () => {
    const subdomainNotFoundStderr =
      '\x1b[31m✘ \x1b[41;31m[\x1b[41;97mERROR\x1b[41;31m]\x1b[0m \x1b[1mA request to the Cloudflare API (/accounts/***/workers/scripts/1795228372-ruleset-based-block-flow/subdomain) failed.\x1b[0m\n\n  This Worker does not exist on your account. [code: 10007]\n'

    const unknownApiErrorStderr =
      '\x1b[31m✘ \x1b[41;31m[\x1b[41;97mERROR\x1b[41;31m]\x1b[0m \x1b[1mA request to the Cloudflare API (/accounts/***/workers/scripts/1791372800-cors-block-react-spa/domains/records) failed.\x1b[0m\n\n  An unknown error has occurred. [code: 10013]\n'

    it('retries on transient /subdomain 10007 errors with exponential backoff and succeeds', async () => {
      vi.useFakeTimers()
      queueWranglerOutcomes([
        { code: 1, stderr: subdomainNotFoundStderr },
        { code: 1, stderr: subdomainNotFoundStderr },
        { code: 0, stdout: 'Deployed successfully\n' },
      ])

      const promise = wranglerDeploy('/tmp/worker', ['--config', 'wrangler.jsonc'])

      await vi.advanceTimersByTimeAsync(1999)
      expect(spawnMock).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(1)
      expect(spawnMock).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(3999)
      expect(spawnMock).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(1)
      await expect(promise).resolves.toBeUndefined()
      expect(spawnMock).toHaveBeenCalledTimes(3)
      expect(spawnMock).toHaveBeenNthCalledWith(3, 'npx', ['wrangler', 'deploy', '--config', 'wrangler.jsonc'], {
        cwd: '/tmp/worker',
        stdio: 'pipe',
      })
    })

    it('retries on transient Cloudflare API 10013 errors and succeeds', async () => {
      vi.useFakeTimers()
      queueWranglerOutcomes([
        { code: 1, stderr: unknownApiErrorStderr },
        { code: 0, stdout: 'Deployed successfully\n' },
      ])

      const promise = wranglerDeploy('/tmp/app')
      await vi.runAllTimersAsync()

      await expect(promise).resolves.toBeUndefined()
      expect(spawnMock).toHaveBeenCalledTimes(2)
    })

    it('stops retrying after 4 total attempts and rejects', async () => {
      vi.useFakeTimers()
      queueWranglerOutcomes([
        { code: 1, stderr: subdomainNotFoundStderr },
        { code: 1, stderr: subdomainNotFoundStderr },
        { code: 1, stderr: subdomainNotFoundStderr },
        { code: 1, stderr: subdomainNotFoundStderr },
      ])

      const promise = wranglerDeploy('/tmp/worker')
      const rejection = expect(promise).rejects.toThrow('Deployment failed with code 1')
      await vi.runAllTimersAsync()

      await rejection
      expect(spawnMock).toHaveBeenCalledTimes(4)
      expect(console.warn).toHaveBeenCalledTimes(3)
      expect(console.warn).toHaveBeenNthCalledWith(
        1,
        'Deployment failed with Cloudflare API error 10007 on /subdomain (attempt 1/4), retrying in 2000ms...'
      )
      expect(console.log).toHaveBeenCalledTimes(1)
    })

    it('rejects immediately without retrying when spawning wrangler fails', async () => {
      spawnMock.mockImplementationOnce(() => {
        const proc = Object.assign(new EventEmitter(), {
          stdout: new PassThrough(),
          stderr: new PassThrough(),
        })
        queueMicrotask(() => {
          proc.emit('error', new Error('spawn npx ENOENT'))
        })
        return proc
      })

      await expect(wranglerDeploy('/tmp/worker')).rejects.toThrow('spawn npx ENOENT')
      expect(spawnMock).toHaveBeenCalledTimes(1)
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('does not retry non-transient errors even on /subdomain', async () => {
      queueWranglerOutcomes([
        {
          code: 1,
          stderr:
            '✘ [ERROR] A request to the Cloudflare API (/accounts/***/workers/scripts/test-worker/subdomain) failed.\n\n  Authentication error [code: 10000]\n',
        },
      ])

      await expect(wranglerDeploy('/tmp/worker')).rejects.toThrow('Deployment failed with code 1')
      expect(spawnMock).toHaveBeenCalledTimes(1)
    })

    it('does not retry 10007 errors on endpoints other than /subdomain', async () => {
      queueWranglerOutcomes([
        {
          code: 1,
          stderr:
            '✘ [ERROR] A request to the Cloudflare API (/accounts/***/workers/scripts/other-worker/bindings) failed.\n\n  This Worker does not exist on your account. [code: 10007]\n',
        },
      ])

      await expect(wranglerDeploy('/tmp/worker')).rejects.toThrow('Deployment failed with code 1')
      expect(spawnMock).toHaveBeenCalledTimes(1)
    })
  })
})
