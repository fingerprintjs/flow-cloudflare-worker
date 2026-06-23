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

export async function wranglerDeploy(cwd: string, args: string[] = []): Promise<void> {
  if (shouldSkip()) {
    return
  }

  await spawnWrangler({ operationName: 'Deployment', cwd, args: ['deploy', ...args] })
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

/**
 * Invokes wrangler using spawn and outputs debugging logs from wrangler when execution fails
 *
 * @param params the parameters for invoking wrangler
 * @returns true, if the execution succeeded; false if params.ignoreWorkerNotFound was true and the worker was not found.
 * @throws if wrangler execution fails
 */
async function spawnWrangler(params: {
  operationName: string
  cwd: string
  ignoreWorkerNotFound?: boolean
  args: string[]
}) {
  return new Promise<boolean>((resolve, reject) => {
    const { operationName, cwd, ignoreWorkerNotFound = false, args } = params
    const wranglerProcess = spawn('npx', ['wrangler', ...args], {
      cwd,
      stdio: 'pipe',
    })
    const { getOutput } = captureOutput(wranglerProcess)

    wranglerProcess.on('close', async (code) => {
      const { stdout, stderr } = getOutput()

      if (code === 0) {
        resolve(true)
      } else {
        if (stdout) {
          if (ignoreWorkerNotFound && stdout.includes('This Worker does not exist on your account')) {
            return resolve(false)
          }
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
        reject(new Error(`${operationName} failed with code ${code}`))
      }
    })
    wranglerProcess.on('error', (e) => {
      reject(e)
    })
  })
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
