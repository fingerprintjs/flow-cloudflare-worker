import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

function shouldSkip() {
  return process.env.SKIP_WRANGLER_COMMANDS === 'true'
}

type WranglerMutationContext = { save: () => Promise<void> }

export async function mutateWranglerConfig(
  configPath: string,
  mutation: (config: any, context: WranglerMutationContext) => Promise<void>
) {
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

export async function wranglerDeploy(cwd: string, args: string[] = []): Promise<void> {
  if (shouldSkip()) {
    return
  }

  return new Promise<void>((resolve, reject) => {
    const process = spawn('npx', ['wrangler', 'deploy', ...args], { cwd, stdio: 'inherit' })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Deployment failed with code ${code}`))
      }
    })
  })
}

export async function wranglerDelete(cwd: string = process.cwd(), args: string[] = []) {
  if (shouldSkip()) {
    return
  }

  return new Promise<void>((resolve, reject) => {
    const process = spawn('npx', ['wrangler', 'delete', ...args], { cwd, stdio: 'inherit' })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Worker removal failed with code ${code}`))
      }
    })
  })
}
