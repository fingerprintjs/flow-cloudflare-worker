import { TestAppFn } from '../types'
import path from 'node:path'
import { mutateWranglerConfig, wranglerDelete, wranglerDeploy } from '../utils/wrangler'
import { execSync } from 'node:child_process'

const appPath = path.resolve(__dirname, '../../../test-apps/react-spa')

/**
 * Handles deployment and removal of the react-spa app.
 * It is deployed as Cloudflare Worker.
 * */
export const spaApp: TestAppFn = (context) => {
  const workerName = context.getWorkerName('react-spa')

  return {
    appName: 'react-spa',
    deploy: async () => {
      /**
       * Since the react-spa uses @cloudflare/vite-plugin and static assets, it's easier to mutate the wrangler config directly rather than making a copy in another directory.
       * The reason is that the `vite build` generates a complete wrangler file with the assets' path.
       * */
      await mutateWranglerConfig(path.join(appPath, 'wrangler.jsonc'), async (config, { save }) => {
        config.name = workerName
        config.routes = [
          {
            custom_domain: true,
            pattern: context.project.host,
          },
        ]

        await save()

        console.info('Building react-spa app...')

        // After wrangler changes, the website needs to be rebuilt
        execSync('pnpm build', {
          cwd: appPath,
          killSignal: 'SIGINT',
          stdio: 'ignore',
          env: {
            PATH: process.env.PATH,
          },
        })

        console.info('Deploying react-spa app...')

        await wranglerDeploy(appPath)
      })
    },

    delete: async () => {
      return wranglerDelete(appPath, ['--name', workerName])
    },
  }
}
