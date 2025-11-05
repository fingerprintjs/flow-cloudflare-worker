import { spawn } from 'node:child_process'

function shouldSkip() {
  return process.env.SKIP_WRANGLER_COMMANDS === 'true'
}

export async function deployWorker(cwd: string): Promise<void> {
  if (shouldSkip()) {
    return
  }

  return new Promise<void>((resolve, reject) => {
    const process = spawn('npx', ['wrangler', 'deploy', '--config', 'wrangler.jsonc'], { cwd, stdio: 'inherit' })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Deployment failed with code ${code}`))
      }
    })
  })
}

export async function deleteWorker(cwd: string) {
  if (shouldSkip()) {
    return
  }

  return new Promise<void>((resolve, reject) => {
    const process = spawn('npx', ['wrangler', 'delete', '--config', 'wrangler.jsonc'], { cwd, stdio: 'inherit' })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Worker removal failed with code ${code}`))
      }
    })
  })
}
