import { ChildProcess, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

function shouldSkip() {
  return process.env.SKIP_WRANGLER_COMMANDS === 'true'
}

type WranglerMutationContext = { save: () => Promise<void> }

/**
 * Mutates the Wrangler configuration file at the specified path using the provided mutation function.
 * Creates a backup of the original file before applying the mutation, and ensures restoration of the
 * original file in case of failure or completion of the operation.
 *
 * @param {string} configPath - The file path of the Wrangler configuration file to be mutated.
 * @param {function} mutation - An asynchronous mutation function that accepts the current configuration
 *                              object and a context, allowing modifications to the configuration.
 *                              The context includes a `save` method to persist the changes.
 * @return {Promise<void>} A promise that resolves when the mutation process is completed.
 */
export async function mutateWranglerConfig(
  configPath: string,
  mutation: (config: any, context: WranglerMutationContext) => Promise<void>
): Promise<void> {
  const wranglerContents = JSON.parse(await fs.readFile(configPath, 'utf-8'))
  const copyName = path.basename(configPath) + '.copy'
  const copyPath = path.join(path.dirname(configPath), copyName)

  // Create copy of the original
  await fs.copyFile(configPath, copyPath)

  try {
    await mutation(wranglerContents, {
      save: async () => {
        await fs.writeFile(configPath, JSON.stringify(wranglerContents, null, 2))
      },
    })
  } finally {
    // Restore original
    await fs.copyFile(copyPath, configPath)
    await fs.unlink(copyPath)
  }
}

function captureOutput(process: ChildProcess) {
  let stdout = ''
  let stderr = ''

  process.stdout?.on('data', (data) => {
    stdout += data.toString()
  })

  process.stderr?.on('data', (data) => {
    stderr += data.toString()
  })

  return {
    getOutput: () => ({ stdout, stderr }),
  }
}

const WORKER_NOT_FOUND_MESSAGE = 'This Worker does not exist on your account'
const WORKER_NOT_FOUND_ERROR_CODE = '[code: 10007]'
const UNKNOWN_API_ERROR_CODE = '[code: 10013]'
// Matches Wrangler's API failure line: "A request to the Cloudflare API (/accounts/.../workers/scripts/<name>/subdomain) failed."
const SUBDOMAIN_ENDPOINT_PATTERN = /\/workers\/scripts\/[^/\s)]+\/subdomain\)/

const MAX_ATTEMPTS = 4
const INITIAL_RETRY_DELAY_MS = 2000

type WranglerRunResult =
  | { status: 'succeeded' }
  | { status: 'not_found' }
  | { status: 'failed'; code: number | null; stdout: string; stderr: string }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isWorkerNotFoundOutput(stdout: string, stderr: string): boolean {
  return stdout.includes(WORKER_NOT_FOUND_MESSAGE) || stderr.includes(WORKER_NOT_FOUND_MESSAGE)
}

function getTransientCloudflareErrorReason(
  output: string,
  options: { retrySubdomainNotFound: boolean }
): string | null {
  if (output.includes(UNKNOWN_API_ERROR_CODE)) {
    return 'Cloudflare API error 10013'
  }

  if (
    options.retrySubdomainNotFound &&
    SUBDOMAIN_ENDPOINT_PATTERN.test(output) &&
    (output.includes(WORKER_NOT_FOUND_ERROR_CODE) || output.includes(WORKER_NOT_FOUND_MESSAGE))
  ) {
    return 'Cloudflare API error 10007 on /subdomain'
  }

  return null
}

export async function wranglerDeploy(cwd: string, args: string[] = []): Promise<void> {
  if (shouldSkip()) {
    return
  }

  await spawnWrangler({
    operationName: 'Deployment',
    cwd,
    retrySubdomainNotFound: true,
    args: ['deploy', ...args],
  })
}

export async function wranglerDelete(cwd: string = process.cwd(), args: string[] = []): Promise<boolean> {
  if (shouldSkip()) {
    return false
  }

  return await spawnWrangler({
    operationName: 'Worker removal',
    cwd,
    ignoreWorkerNotFound: true,
    args: ['delete', ...args],
  })
}

function runWranglerOnce(params: {
  cwd: string
  ignoreWorkerNotFound: boolean
  args: string[]
}): Promise<WranglerRunResult> {
  return new Promise<WranglerRunResult>((resolve, reject) => {
    const { cwd, ignoreWorkerNotFound, args } = params
    const wranglerProcess = spawn('npx', ['wrangler', ...args], {
      cwd,
      stdio: 'pipe',
    })
    const { getOutput } = captureOutput(wranglerProcess)

    wranglerProcess.on('close', (code) => {
      const { stdout, stderr } = getOutput()

      if (code === 0) {
        resolve({ status: 'succeeded' })
      } else if (ignoreWorkerNotFound && isWorkerNotFoundOutput(stdout, stderr)) {
        resolve({ status: 'not_found' })
      } else {
        resolve({ status: 'failed', code, stdout, stderr })
      }
    })
    wranglerProcess.on('error', (e) => {
      reject(e)
    })
  })
}

async function logFailedWranglerOutput(stdout: string, stderr: string): Promise<void> {
  if (stdout) {
    console.log(`-----START wrangler stdout-----\n\n${stdout}\n\n-----END wrangler stdout-----`)
  }
  if (stderr) {
    console.log(`-----START wrangler stderr-----\n\n${stderr}\n\n-----END wrangler stderr-----`)
  }

  try {
    await logWranglerLogs(stdout, stderr)
  } catch (e) {
    console.error(`Failed to log wrangler logs: ${e}`)
  }
}

/**
 * Invokes wrangler using spawn, retrying transient Cloudflare API errors, and outputs debugging logs when execution fails.
 *
 * @param params the parameters for invoking wrangler
 * @returns true, if the execution succeeded; false if params.ignoreWorkerNotFound was true and the worker was not found.
 * @throws if wrangler execution fails
 */
async function spawnWrangler(params: {
  operationName: string
  cwd: string
  /** true if the "worker not found" error returned by wrangler for a nonexistent worker should not be treated as a failure */
  ignoreWorkerNotFound?: boolean
  /** true to retry Cloudflare's post-upload /subdomain read-after-write race (code 10007) */
  retrySubdomainNotFound?: boolean
  args: string[]
}): Promise<boolean> {
  const { operationName, cwd, ignoreWorkerNotFound = false, retrySubdomainNotFound = false, args } = params

  for (let attempt = 1; ; attempt++) {
    const result = await runWranglerOnce({ cwd, ignoreWorkerNotFound, args })

    switch (result.status) {
      case 'succeeded':
        return true
      case 'not_found':
        return false
      case 'failed': {
        const combinedOutput = `${result.stdout}\n${result.stderr}`
        const retryReason = getTransientCloudflareErrorReason(combinedOutput, { retrySubdomainNotFound })
        if (attempt < MAX_ATTEMPTS && retryReason) {
          const delayMs = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1)
          console.warn(
            `${operationName} failed with ${retryReason} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delayMs}ms...`
          )
          await sleep(delayMs)
          continue
        }

        await logFailedWranglerOutput(result.stdout, result.stderr)
        throw new Error(`${operationName} failed with code ${result.code}`)
      }
      default: {
        const _exhaustive: never = result
        return _exhaustive
      }
    }
  }
}

const WRANGLER_LOGS_WRITTEN_REGEX: RegExp = /Logs were written to "(?<wranglerLogPath>[^"]+)"/

async function logWranglerLogs(stdout?: string, stderr?: string) {
  let wranglerLogPath: string | undefined
  if (stdout) {
    const stdoutResult = WRANGLER_LOGS_WRITTEN_REGEX.exec(stdout)
    wranglerLogPath = stdoutResult?.groups?.wranglerLogPath
  }

  if (!wranglerLogPath && stderr) {
    const stderrResult = WRANGLER_LOGS_WRITTEN_REGEX.exec(stderr)
    wranglerLogPath = stderrResult?.groups?.wranglerLogPath
  }

  if (wranglerLogPath) {
    const logFileContents = await fs.readFile(wranglerLogPath, 'utf-8')
    console.log(
      `-----START wrangler logs from "${wranglerLogPath}"-----\n\n${logFileContents}\n\n-----END wrangler logs-----`
    )
  }
}
