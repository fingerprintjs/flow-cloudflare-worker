import { spawn } from 'node:child_process'

export function deployWorker(cwd: string): Promise<void> {
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

export function deleteWorker(cwd: string) {
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
