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

  return new Promise<void>((resolve, reject) => {
    const process = spawn('npx', ['wrangler', 'deploy', ...args], { cwd, stdio: 'pipe' })
    const { getOutput } = captureOutput(process)

    process.on('close', (code) => {
      const { stdout, stderr } = getOutput()

      if (code === 0) {
        resolve()
      } else {
        if (stdout) {
          console.log(stdout)
        }
        if (stderr) {
          console.error(stderr)
        }
        reject(new Error(`Deployment failed with code ${code}`))
      }
    })
  })
}

export async function wranglerDelete(cwd: string = process.cwd(), args: string[] = []) {
  if (shouldSkip()) {
    return false
  }

  return new Promise<boolean>((resolve, reject) => {
    const process = spawn('npx', ['wrangler', 'delete', ...args], {
      cwd,
      stdio: 'pipe',
    })
    const { getOutput } = captureOutput(process)

    process.on('close', (code) => {
      const { stdout, stderr } = getOutput()

      if (code === 0) {
        resolve(true)
      } else {
        if (stdout) {
          if (stdout.includes('This Worker does not exist on your account')) {
            return resolve(false)
          }

          console.log(stdout)
        }
        if (stderr) {
          console.error(stderr)
        }

        reject(new Error(`Worker removal failed with code ${code}`))
      }
    })
  })
}
