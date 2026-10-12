#!/usr/bin/env node
// Runs wrangler against a throwaway test worker. Run from the repo root:
//   node .agents/skills/verify-flow-worker/scripts/wrangler.mjs <worker-name> <wrangler args...>
//
// On first use it writes .wrangler/verify/<worker-name>.jsonc from wrangler.example.jsonc.
// Edit that file for test-specific vars; delete it to regenerate.
// Cloudflare credentials come from .env.verify.local and never appear in the config.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const skillDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const [name, ...wranglerArgs] = process.argv.slice(2)

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (!name || wranglerArgs.length === 0) {
  fail('Usage: wrangler.mjs <worker-name> <wrangler args...>')
}
if (!name.startsWith('verify-')) {
  fail(`Worker name must start with "verify-" so it can't overwrite a real worker: ${name}`)
}

try {
  process.loadEnvFile('.env.verify.local')
} catch {
  fail(`Missing .env.verify.local. Copy ${join(skillDir, 'env.verify.example')} there and ask the user to fill it in.`)
}

const configPath = `.wrangler/verify/${name}.jsonc`

if (!existsSync(configPath)) {
  const config = JSON.parse(readFileSync('wrangler.example.jsonc', 'utf8'))

  // Values from the Fingerprint env file are uploaded as secrets, and a key can't be both a var and a secret.
  const secretKeys = Object.keys(parseEnv(readFileSync(join(skillDir, 'env.verify.fingerprint.example'), 'utf8')))
  for (const key of secretKeys) {
    delete config.vars[key]
  }

  config.name = name
  config.routes = [{ pattern: `${name}.${process.env.VERIFY_ZONE}`, custom_domain: true }]
  // The build output is already bundled; wrangler can't re-bundle the `?raw` imports in src.
  config.main = '../../dist/flow_cloudflare_worker/index.js'
  config.no_bundle = true

  mkdirSync(dirname(configPath), { recursive: true })
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  console.log(`Wrote ${configPath}`)
}

const result = spawnSync('pnpm', ['exec', 'wrangler', '--config', configPath, ...wranglerArgs], { stdio: 'inherit' })
process.exit(result.status ?? 1)
