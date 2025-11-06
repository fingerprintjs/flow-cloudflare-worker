import { config } from 'dotenv'
import { deployFlowWorkers } from './flowWorker'
import { deployWebsite } from './website'

config({
  path: ['.env', '.env.local'],
})

async function main() {
  if (process.env.SKIP_WEBSITE != 'true') {
    await deployWebsite()
  }

  await deployFlowWorkers()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
